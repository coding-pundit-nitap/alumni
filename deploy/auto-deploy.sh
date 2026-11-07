#!/usr/bin/env bash
# Releases the newest commit on origin/main once all of CI passed. alumini-deploy.timer runs it after boot and
# every 5 minutes, so a host that was off or offline catches up on its own.
#
# A commit is released only when GitHub reports its CI OK check as successful and all four images exist.
# A network failure is never a failed release: the run stops and the next one tries again. A commit whose release
# failed is rolled back and not tried again; the next commit on main is.
#
# Exit 0: released, nothing to do, or waiting (CI, network, the app starting).
# Exit 1: a person is needed. The alumini_auto_deploy_blocked metric stays at 1 until that is resolved.
set -euo pipefail

cd "$(dirname "$0")"
LOG=releases.log
# <sha> <previous sha>, present from just before a release until it finishes.
INFLIGHT=.auto-deploy-inflight
# The commit that is not to be released: its release failed, or a person rolled back from it.
FAILED=.auto-deploy-failed
# <sha> <count> of releases cut off after they changed the host.
ATTEMPTS=.auto-deploy-attempts
MAX_INTERRUPTED=3
# When this host first saw that it is behind main.
PENDING=.auto-deploy-pending
LOCK=.auto-deploy.lock
RETRY_LATER=75
NEEDS_PERSON=78
NET_TIMEOUT_S=${AUTO_DEPLOY_NET_TIMEOUT_S:-30}
IMAGES=(web worker migrate postgres)
export GIT_TERMINAL_PROMPT=0
# deploy.sh keeps this run's own rollbacks out of the marker it writes for a person's rollback.
export AUTO_DEPLOY=1

say() { echo "auto-deploy: $*" >&2; }
env_get() { sed -n "s/^$1=//p" .env 2> /dev/null | tail -1 | tr -d "\"'"; }

# The directory node_exporter reads, which deploy/monitoring.yml mounts from the same variable.
METRICS_DIR=${BACKUP_METRICS_DIR:-$(env_get BACKUP_METRICS_DIR)}
METRICS_DIR=${METRICS_DIR:-/var/lib/prometheus/node-exporter}

# Written only by a run that reached GitHub and the registry, so an offline run leaves the last known state alone.
checked=no
blocked=0

write_metrics() {
  local file=$1 tmp
  if [ ! -d "$METRICS_DIR" ] || [ ! -w "$METRICS_DIR" ]; then
    say "$METRICS_DIR is not writable, so the auto-deploy alerts cannot fire"
    cat > /dev/null
    return 0
  fi
  tmp="$METRICS_DIR/$file.$$"
  cat > "$tmp"
  mv "$tmp" "$METRICS_DIR/$file"
}

export_metrics() {
  [ "$checked" = yes ] || [ "$blocked" = 1 ] || return 0
  if [ "$checked" = yes ]; then
    write_metrics alumini_auto_deploy_check.prom <<EOF
# HELP alumini_auto_deploy_last_check_timestamp_seconds When this host last reached GitHub and the registry.
# TYPE alumini_auto_deploy_last_check_timestamp_seconds gauge
alumini_auto_deploy_last_check_timestamp_seconds $(date +%s)
EOF
  fi
  write_metrics alumini_auto_deploy_state.prom <<EOF
# HELP alumini_auto_deploy_blocked 1 when automatic releases need a person.
# TYPE alumini_auto_deploy_blocked gauge
alumini_auto_deploy_blocked $blocked
# HELP alumini_auto_deploy_pending_since_timestamp_seconds When this host first fell behind main; 0 when it is not.
# TYPE alumini_auto_deploy_pending_since_timestamp_seconds gauge
alumini_auto_deploy_pending_since_timestamp_seconds $(cat "$PENDING" 2> /dev/null || echo 0)
EOF
}
trap export_metrics EXIT

wait_for() { say "$*; trying again on the next run"; exit 0; }
block() { blocked=1; say "$*"; exit 1; }

# Rolling back also recovers a release cut off at any point before it finished: the last completed release comes
# back, and the next run moves forward again.
rollback_to() {
  local sha=$1 rc=0
  ./deploy.sh rollback "$sha" || rc=$?
  case "$rc" in
    0) return 0 ;;
    "$RETRY_LATER") wait_for "another release is running" ;;
    *) block "rollback to $sha failed; the site may be down" ;;
  esac
}

# A release that keeps being cut off, by a hang or by the host dying under it, must not repeat its migration forever.
count_interrupted() {
  local sha=$1 seen="" count=0
  if [ -f "$ATTEMPTS" ]; then read -r seen count < "$ATTEMPTS" || true; fi
  [ "$seen" = "$sha" ] || count=0
  count=$((count + 1))
  echo "$sha $count" > "$ATTEMPTS"
  [ "$count" -lt "$MAX_INTERRUPTED" ] || echo "$sha" > "$FAILED"
}

# A power cut or a killed run leaves $INFLIGHT behind. Containers restart as they were, while .env may already name
# the new release, so RELEASE_SHA alone cannot show that it never finished. Only a logged, passing release did.
recover_interrupted() {
  local sha="" previous="" last
  [ -f "$INFLIGHT" ] || return 0
  read -r sha previous < "$INFLIGHT" || true
  # Cut off while being written, which is before deploy.sh ran.
  if [ -z "$sha" ] || [ -z "$previous" ]; then
    rm -f "$INFLIGHT"
    return 0
  fi
  last=$(tail -n 1 "$LOG" 2> /dev/null || true)
  case "$last" in
    *" sha=$sha "*" smoke=pass "* | *" sha=$sha "*" smoke=pass-local "*)
      rm -f "$INFLIGHT"
      return 0
      ;;
    *" sha=$sha "*" smoke=fail "*)
      echo "$sha" > "$FAILED"
      ;;
  esac
  # An unchanged RELEASE_SHA means it stopped during the pull, which the network can do at any time.
  if [ "$(env_get RELEASE_SHA)" != "$previous" ]; then count_interrupted "$sha"; fi
  say "the release of $sha did not finish; returning to $previous"
  rollback_to "$previous"
  rm -f "$INFLIGHT"
  wait_for "recovered from an interrupted release"
}

github_repo() {
  git remote get-url origin | sed -E 's#\.git$##; s#^.*[:/]([^/:]+/[^/:]+)$#\1#'
}

# Success only when every CI OK run for the commit concluded success. Absent, running and failed all wait.
ci_passed() {
  local sha=$1 response code conclusions
  response=$(curl -s -m "$NET_TIMEOUT_S" -w '\n%{http_code}' -H 'accept: application/vnd.github+json' \
    "https://api.github.com/repos/$(github_repo)/commits/$sha/check-runs?check_name=CI%20OK&filter=latest") ||
    response=$'\n000'
  code=${response##*$'\n'}
  case "$code" in
    200) ;;
    401 | 404) block "GitHub answered $code for the checks of $sha; automatic releases need a public repository" ;;
    # 403 and 429 are GitHub's rate limits, 5xx its outages.
    *) wait_for "GitHub is unavailable (HTTP $code)" ;;
  esac
  conclusions=$(grep -oE '"conclusion": *("[a-z_]+"|null)' <<< "$response" || true)
  [ -n "$conclusions" ] && ! grep -qv '"success"' <<< "$conclusions"
}

# Returns 1 while an image is missing. docker manifest inspect exits 1 for every failure, so its message decides.
images_published() {
  local sha=$1 registry name output
  registry=$(env_get IMAGE_REGISTRY)
  for name in "${IMAGES[@]}"; do
    output=$(timeout "$NET_TIMEOUT_S" docker manifest inspect "$registry/alumini-$name:$sha" 2>&1 > /dev/null) && continue
    case "$output" in
      *"manifest unknown"* | *"no such manifest"*) return 1 ;;
      *denied* | *unauthorized*) block "the registry refused alumini-$name: renew the login, or the package does not exist" ;;
      *) wait_for "cannot reach the registry" ;;
    esac
  done
}

release() {
  local sha=$1 previous=$2 rc=0
  echo "$sha $previous" > "$INFLIGHT"
  sync "$INFLIGHT"
  ./deploy.sh pull "$sha" || rc=$?
  case "$rc" in
    0)
      rm -f "$INFLIGHT" "$PENDING" "$FAILED" "$ATTEMPTS"
      ;;
    "$RETRY_LATER")
      rm -f "$INFLIGHT"
      wait_for "the release could not start"
      ;;
    "$NEEDS_PERSON")
      rm -f "$INFLIGHT"
      block "$sha was not released; once this host is fixed, the next run releases it"
      ;;
    *)
      echo "$sha" > "$FAILED"
      # A failed migration has already restored the previous release, and the running one was never touched.
      if [ "$(env_get RELEASE_SHA)" != "$previous" ]; then rollback_to "$previous"; fi
      rm -f "$INFLIGHT"
      block "the release of $sha failed; it will not be tried again"
      ;;
  esac
}

exec 8> "$LOCK"
flock -n 8 || exit 0

[ -f .env ] || block "deploy/.env is missing"
[ -n "$(env_get IMAGE_REGISTRY)" ] || block "set IMAGE_REGISTRY in deploy/.env"
# Without a smoke test a broken release would look healthy and never roll back.
if [ -z "$(env_get SMOKE_EMAIL)" ] || [ -z "$(env_get SMOKE_PASSWORD)" ]; then
  block "set SMOKE_EMAIL and SMOKE_PASSWORD in deploy/.env"
fi
live=$(env_get RELEASE_SHA)
[ -n "$live" ] || block "no release yet: run deploy/deploy.sh pull by hand first"

recover_interrupted

# Also true for a while after boot. A release now would be blamed for a stack that was already down.
web_port=$(env_get WEB_PORT)
curl -sf -o /dev/null -m 5 "http://127.0.0.1:${web_port:-3000}/health/ready" || wait_for "the live release is not ready"

latest=$(timeout "$NET_TIMEOUT_S" git ls-remote origin refs/heads/main) || wait_for "cannot reach origin"
latest=${latest%%[[:space:]]*}
[ -n "$latest" ] || block "origin has no main branch"

if [ "$latest" = "$live" ]; then
  checked=yes
  rm -f "$PENDING" "$FAILED"
  exit 0
fi
[ -f "$PENDING" ] || date +%s > "$PENDING"

if [ "$latest" = "$(cat "$FAILED" 2> /dev/null || true)" ]; then
  checked=yes
  blocked=1
  say "$latest failed its release; waiting for a new commit"
  exit 0
fi

if ! ci_passed "$latest"; then
  checked=yes
  say "$latest has not passed CI"
  exit 0
fi
if ! images_published "$latest"; then
  checked=yes
  say "$latest has passed CI, but its images are not all published yet"
  exit 0
fi
checked=yes

release "$latest" "$live"
