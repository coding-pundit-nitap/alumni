#!/usr/bin/env bash
# Releases a commit on a self-hosted server (deploy/README.md). Run from anywhere inside the clone. The clone's
# deploy/.env says which environment it is (DEPLOY_ENV=staging or production; production when unset).
#
#   deploy/deploy.sh build                     git pull, build the four images on this host, release them
#   deploy/deploy.sh pull [sha]                staging: git pull (or exactly <sha>), pull CI's images, pin them by
#                                              digest, release, smoke test. Production too, only with
#                                              RELEASE_SOURCE=ci (one server, no staging)
#   deploy/deploy.sh promote <sha> <approver>  production: release exactly the digests that passed staging's
#                                              smoke test for <sha>
#   deploy/deploy.sh rollback <sha>            start web and worker on an earlier release (no git, no migrations)
#   deploy/deploy.sh smoke                     run the smoke test against the live release
#   deploy/deploy.sh status                    current release and the history
#
# A release is: migrate (one-shot) → every service on the new images → wait for /health/ready → smoke test →
# one line in releases.log, which holds the images by reference and is what rollback and promote read.
#
# Exit 75 means nothing was released and trying again later is safe: the network failed, the images are not
# published yet, or another release is running. Exit 78 means nothing was released because this host needs a
# person (local changes, a clone that cannot move); the commit is not at fault. Any other failure was a release.
set -euo pipefail

cd "$(dirname "$0")"
REPO=..
LOG=releases.log
READY_TIMEOUT_S=180
# Curl's own default is no limit, and a dropped connection can hang for minutes.
SMOKE_REQUEST_TIMEOUT_S=20
READY_REQUEST_TIMEOUT_S=5
IMAGES=(web worker migrate postgres)

die() { echo "deploy: $*" >&2; exit 1; }
retry_later() { echo "deploy: $*" >&2; exit 75; }
refuse() { echo "deploy: $*" >&2; exit 78; }
env_get() { sed -n "s/^$1=//p" .env | tail -1 | tr -d "\"'"; }
env_set() {
  if grep -q "^$1=" .env; then sed -i "s|^$1=.*|$1=$2|" .env; else echo "$1=$2" >> .env; fi
}
# releases.log lines are `<time> key=value …`; values never contain spaces.
field() { sed -n "s/.* $2=\([^ ]*\).*/\1/p" <<< "$1"; }
var_of() { echo "${1^^}_IMAGE"; }

[ -f .env ] || die "deploy/.env is missing; copy deploy/.env.example and fill it in (README step 4)"
ENVIRONMENT=$(env_get DEPLOY_ENV)
ENVIRONMENT=${ENVIRONMENT:-production}
case "$ENVIRONMENT" in staging | production) ;; *) die "DEPLOY_ENV must be staging or production" ;; esac
WEB_PORT=$(env_get WEB_PORT)
LOCAL_URL=http://127.0.0.1:${WEB_PORT:-3000}
READY_URL=$LOCAL_URL/health/ready

case "${1:-}" in
  build | pull | promote | rollback)
    # The kernel drops the lock with the process, so a power cut cannot leave it held.
    exec 9> .deploy.lock
    flock -n 9 || retry_later "another release is running on this host"
    ;;
esac

require_clean() {
  [ -z "$(git -C "$REPO" status --porcelain --untracked-files=no)" ] ||
    refuse "the clone has local changes; the server must run exactly what is in git"
}

git_update() {
  require_clean
  # Callers run this in $(…), where bash turns set -e off, so each failure stops it explicitly.
  # Progress to stderr: stdout is the SHA the caller captures.
  git -C "$REPO" fetch --quiet >&2 || retry_later "cannot reach origin; nothing was released"
  git -C "$REPO" merge --quiet --ff-only '@{upstream}' >&2 || refuse "the clone cannot fast-forward to its upstream"
  git -C "$REPO" rev-parse HEAD
}

# Moves the clone forward to exactly <sha>, which must already be on origin/main.
git_advance() {
  local sha=$1
  require_clean
  git -C "$REPO" fetch --quiet origin || retry_later "cannot reach origin; nothing was released"
  git -C "$REPO" merge-base --is-ancestor "$sha" origin/main ||
    refuse "$sha is not on origin/main"
  git -C "$REPO" merge-base --is-ancestor HEAD "$sha" ||
    refuse "this clone is already past $sha; to go back to an older release use: deploy/deploy.sh rollback $sha"
  git -C "$REPO" merge --quiet --ff-only "$sha" >&2 || refuse "the clone cannot fast-forward to $sha"
}

build_images() {
  local sha=$1
  docker build -f "$REPO/docker/web.Dockerfile" --build-arg GIT_SHA="$sha" -t "alumini-web:$sha" "$REPO"
  docker build -f "$REPO/docker/web.Dockerfile" --build-arg GIT_SHA="$sha" --target migrate \
    -t "alumini-migrate:$sha" "$REPO"
  docker build -f "$REPO/docker/worker.Dockerfile" --build-arg GIT_SHA="$sha" -t "alumini-worker:$sha" "$REPO"
  docker build -f "$REPO/docker/postgres.Dockerfile" -t "alumini-postgres:$sha" "$REPO/docker"
}

# The digest reference (repo@sha256:…) of a tag that has been pulled.
digest_of() {
  local ref=$1 repo=${1%:*} digest
  digest=$(docker image inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$ref" | grep -m1 "^$repo@") ||
    refuse "no registry digest for $ref"
  echo "$digest"
}

wait_ready() {
  local waited=0
  until curl -sf -o /dev/null -m "$READY_REQUEST_TIMEOUT_S" "$READY_URL"; do
    if [ "$waited" -ge "$READY_TIMEOUT_S" ]; then
      docker compose logs --tail 50 web worker
      die "web is not ready after ${READY_TIMEOUT_S}s (logs above). Roll back: deploy/deploy.sh rollback <sha>"
    fi
    sleep 3
    waited=$((waited + 3))
  done
}

# Status of one smoke request; 000 when no HTTP answer came back.
smoke_request() {
  local code
  code=$(curl -s -o /dev/null -m "$SMOKE_REQUEST_TIMEOUT_S" -w '%{http_code}' "$@") || code=000
  echo "$code"
}

# Ready, sign in with the smoke account, one authenticated read. Prints pass, fail or unreachable (no HTTP
# answer at some step, so the path to the app failed and the app itself was not judged).
smoke_at() {
  local url=$1 origin email password headers code cookie
  origin=$(env_get APP_URL)
  email=$(env_get SMOKE_EMAIL)
  password=$(env_get SMOKE_PASSWORD)
  headers=$(mktemp)
  # shellcheck disable=SC2064 # expand now: $headers is local
  trap "rm -f '$headers'" RETURN
  code=$(smoke_request "$url/health/ready")
  case "$code" in 200) ;; 000) echo unreachable; return ;; *) echo "deploy: smoke: $url/health/ready answered $code" >&2; echo fail; return ;; esac
  # SMOKE_PASSWORD is hex (README), so it needs no JSON escaping.
  code=$(smoke_request -D "$headers" -X POST "$url/api/auth/sign-in/email" \
    -H 'content-type: application/json' -H "origin: $origin" \
    --data "{\"email\":\"$email\",\"password\":\"$password\"}")
  case "$code" in 200) ;; 000) echo unreachable; return ;; *) echo "deploy: smoke: sign-in answered $code" >&2; echo fail; return ;; esac
  # Sent by hand: curl's cookie engine drops Secure cookies when SMOKE_URL is plain http.
  cookie=$(tr -d '\r' < "$headers" | sed -n 's/^[Ss]et-[Cc]ookie: *\([^;]*\).*/\1/p' | paste -sd ';' - | sed 's/;/; /g')
  code=$(smoke_request -H "cookie: $cookie" "$url/api/v1/alumni?limit=5")
  case "$code" in 200) ;; 000) echo unreachable; return ;; *) echo "deploy: smoke: GET /api/v1/alumni answered $code" >&2; echo fail; return ;; esac
  echo pass
}

# The restore drill's check, through the public URL so TLS and Nginx are in the path. If this host cannot reach
# that URL, the check runs against the app directly: a network outage must not fail a good release. Prints pass,
# pass-local (only the direct check ran, which promote does not accept), fail or skipped (no smoke account).
smoke() {
  local url result
  url=$(env_get SMOKE_URL)
  url=${url:-$(env_get APP_URL)}
  if [ -z "$(env_get SMOKE_EMAIL)" ] || [ -z "$(env_get SMOKE_PASSWORD)" ]; then echo skipped; return; fi
  result=$(smoke_at "$url")
  if [ "$result" = unreachable ]; then
    echo "deploy: smoke: $url is unreachable from this host; checking the app directly" >&2
    result=$(smoke_at "$LOCAL_URL")
    case "$result" in pass) result=pass-local ;; unreachable) result=fail ;; esac
  fi
  echo "$result"
}

# release <sha> <source> <migrate yes|no> <by> <web> <worker> <migrate> <postgres>
release() {
  local sha=$1 source=$2 migrate=$3 by=$4 refs=("${@:5}") previous i var result line
  previous=$(env_get RELEASE_SHA)
  declare -A before
  for i in "${!IMAGES[@]}"; do
    var=$(var_of "${IMAGES[$i]}")
    before[$var]=$(env_get "$var")
    env_set "$var" "${refs[$i]}"
  done
  env_set RELEASE_SHA "$sha"
  if [ "$migrate" = yes ]; then
    # A failed migration stops here, before the running release is touched.
    docker compose run --rm migrate || {
      for var in "${!before[@]}"; do env_set "$var" "${before[$var]}"; done
      env_set RELEASE_SHA "$previous"
      die "migration failed; the previous release (${previous:-none}) is still running"
    }
  fi
  docker compose up -d --remove-orphans
  wait_ready
  result=$(smoke)
  line="$(date -u +%FT%TZ) sha=$sha env=$ENVIRONMENT source=$source"
  for i in "${!IMAGES[@]}"; do line+=" ${IMAGES[$i]}=${refs[$i]}"; done
  line+=" smoke=$result by=${by// /_} was=${previous:-none}"
  echo "$line" >> "$LOG"
  [ "$result" != fail ] || die "$sha is live but failed the smoke test (above). Roll back: deploy/deploy.sh rollback ${previous:-<sha>}"
  echo "deploy: $sha is live (smoke: $result)"
}

case "${1:-}" in
  build)
    sha=$(git_update)
    build_images "$sha"
    [ "$ENVIRONMENT" = staging ] || echo "deploy: build mode skips staging; this release is not promoted" >&2
    release "$sha" build yes "$(whoami)" "alumini-web:$sha" "alumini-worker:$sha" "alumini-migrate:$sha" "alumini-postgres:$sha"
    ;;
  pull)
    # Production releases what staging tested, unless it has no staging and opts in to CI's images directly.
    [ "$ENVIRONMENT" = staging ] || [ "$(env_get RELEASE_SOURCE)" = ci ] ||
      refuse "production releases what staging tested: deploy/deploy.sh promote <sha> <approver> (README Releasing). A single server without staging sets RELEASE_SOURCE=ci in deploy/.env"
    registry=$(env_get IMAGE_REGISTRY)
    [ -n "$registry" ] || refuse "set IMAGE_REGISTRY in deploy/.env (e.g. ghcr.io/owner)"
    sha=${2:-}
    if [ -n "$sha" ]; then git_advance "$sha"; else sha=$(git_update); fi
    refs=()
    for name in "${IMAGES[@]}"; do
      docker pull "$registry/alumini-$name:$sha" ||
        retry_later "cannot pull the $name image for $sha: CI publishes only after every check on main passes, or this host is offline"
      # On its own line: a failure inside an array append would not stop the script.
      ref=$(digest_of "$registry/alumini-$name:$sha")
      refs+=("$ref")
    done
    release "$sha" pull yes "$(whoami)" "${refs[@]}"
    ;;
  promote)
    [ "$ENVIRONMENT" = production ] || die "promote is for production; staging releases with: deploy/deploy.sh pull"
    sha=${2:-}
    approver=${3:-}
    [ -n "$sha" ] && [ -n "$approver" ] || die "usage: deploy/deploy.sh promote <sha> <approver>"
    staging=$(env_get STAGING_RELEASES)
    [ -n "$staging" ] || die "set STAGING_RELEASES in deploy/.env: staging's releases.log, as a path or host:path"
    if [[ "$staging" == /* ]]; then
      staged=$(cat "$staging") || die "cannot read $staging"
    else
      staged=$(ssh -o BatchMode=yes "${staging%%:*}" cat "${staging#*:}") || die "cannot read $staging over ssh"
    fi
    line=$(grep " sha=$sha" <<< "$staged" | grep " env=staging " | grep " source=pull " | grep " smoke=pass " | tail -1) ||
      die "$sha has no staging release from CI's images with a passing smoke test; release it on staging first"
    sha=$(field "$line" sha)
    git_advance "$sha"
    refs=()
    for name in "${IMAGES[@]}"; do
      refs+=("$(field "$line" "$name")")
      docker pull "${refs[-1]}"
    done
    release "$sha" promote yes "$approver" "${refs[@]}"
    ;;
  rollback)
    sha=${2:-}
    [ -n "$sha" ] || die "usage: deploy/deploy.sh rollback <sha>  (see: deploy/deploy.sh status)"
    line=$(grep " sha=$sha" "$LOG" | grep " web=" | tail -1) || die "$sha is not in $LOG"
    sha=$(field "$line" sha)
    refs=()
    for name in "${IMAGES[@]}"; do refs+=("$(field "$line" "$name")"); done
    # Pull mode: digests pull again if pruned. Build mode: the images must still be on the host (README).
    for ref in "${refs[@]}"; do
      docker image inspect "$ref" > /dev/null 2>&1 || docker pull "$ref" ||
        die "$ref is gone from this host; rebuild it from git or release forward instead"
    done
    # alumini-deploy.timer would otherwise release again what a person just rolled away from.
    live=$(env_get RELEASE_SHA)
    if [ -z "${AUTO_DEPLOY:-}" ] && [ -n "$live" ] && [ "$live" != "$sha" ]; then
      echo "$live" > .auto-deploy-failed
    fi
    # Expand-only migrations keep the older release working on the newer schema.
    release "$sha" rollback no "$(whoami)" "${refs[@]}"
    ;;
  smoke)
    result=$(smoke)
    echo "smoke: $result"
    [ "$result" != fail ]
    ;;
  status)
    echo "$ENVIRONMENT, live: $(env_get RELEASE_SHA)"
    for name in "${IMAGES[@]}"; do echo "  $name: $(env_get "$(var_of "$name")")"; done
    [ -f "$LOG" ] && tail -n 10 "$LOG"
    docker compose ps
    ;;
  *)
    sed -n '2,15p' "$0"
    exit 1
    ;;
esac
