import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";

/**
 * Runs the real deploy/auto-deploy.sh and deploy/deploy.sh against stand-ins
 * for docker, git and curl, whose behaviour each case sets through files in
 * $STATE. Needs bash, flock and timeout; no Docker and no network.
 */
const root = path.resolve(import.meta.dirname, "../..");
const OLD = "a".repeat(40);
const NEW = "b".repeat(40);
const NEWER = "c".repeat(40);
const IMAGES = ["web", "worker", "migrate", "postgres"];

const COMMON = `#!/usr/bin/env bash
s() { cat "$STATE/$1" 2>/dev/null || echo "$2"; }
`;

const DOCKER = `${COMMON}
echo "docker $*" >> "$STATE/calls"
case "$1 \${2:-}" in
  "manifest inspect")
    name=\${3##*/alumini-}; name=\${name%%:*}
    case "$(s "manifest-$name" ok)" in
      ok) exit 0 ;;
      unknown) echo "manifest unknown" >&2 ;;
      denied) echo "Get https://ghcr.io/v2/x: denied" >&2 ;;
      unauthorized) echo "unauthorized: authentication required" >&2 ;;
      offline) echo "dial tcp: lookup ghcr.io: no such host" >&2 ;;
    esac
    exit 1 ;;
  "image inspect")
    ref=\${!#}
    echo "\${ref%:*}@sha256:\${ref##*:}"
    exit 0 ;;
  "compose run") [ "$(s migrate ok)" = ok ]; exit $? ;;
  "compose up")
    if [ -f "$STATE/broken" ]; then
      echo down > "$STATE/app"
    elif grep -q "^WEB_IMAGE=.*$(s bad none)" .env; then
      s bad-mode down > "$STATE/app"
    else
      echo up > "$STATE/app"
    fi
    exit 0 ;;
esac
if [ "$1" = pull ]; then
  [ "$(s pull ok)" = ok ] || exit 1
  case "$2" in *"$(s unpublished none)"*) exit 1 ;; esac
fi
exit 0
`;

const GIT = `${COMMON}
echo "git $*" >> "$STATE/calls"
[ "$1" != -C ] || shift 2
case "$1" in
  ls-remote)
    [ "$(s network up)" != hang ] || exec /bin/sleep 10
    [ "$(s network up)" = up ] || exit 128
    printf '%s\\trefs/heads/main\\n' "$(s head)" ;;
  remote) echo git@github.com:Owner/alumni.git ;;
  status) s dirty "" ;;
  fetch)
    [ "$(s git-fetch ok)" = ok ] || exit 128
    if [ -f "$STATE/moves-to" ]; then cp "$STATE/moves-to" "$STATE/head"; fi ;;
  merge-base) ;;
  merge)
    [ "$(s diverged no)" = no ] || exit 1
    ref=\${!#}
    case "$ref" in
      @*) cp "$STATE/head" "$STATE/clone" ;;
      *) echo "$ref" > "$STATE/clone" ;;
    esac ;;
  rev-parse) cat "$STATE/clone" ;;
esac
`;

const CURL = `${COMMON}
args="$*"
url=; out=-; headers=; write=0; fail=0
while [ $# -gt 0 ]; do
  case "$1" in
    -o) out=$2; shift 2 ;;
    -D) headers=$2; shift 2 ;;
    -w) write=1; shift 2 ;;
    -m | -X | -H | --data) shift 2 ;;
    -sf) fail=1; shift ;;
    -s) shift ;;
    *) url=$1; shift ;;
  esac
done
echo "curl $url" >> "$STATE/calls"
app() {
  [ "$(s app up)" = up ] || { [ "$(s app up)" = signin ] && [ "\${url#*sign-in}" = "$url" ]; } || {
    [ "$(s app up)" = signin ] && { echo 401; return; }
    echo 000; return
  }
  case "$url" in
    *sign-in*)
      [ -z "$headers" ] || printf 'Set-Cookie: session=x; Secure\\r\\n' > "$headers"
      s signin 200 ;;
    *) echo 200 ;;
  esac
}
case "$url" in
  *api.github.com*)
    code=$(s ci-http 200)
    case "$(s ci success)" in
      success) body='{"check_runs": [{"conclusion": "success"}]}' ;;
      failure) body='{"check_runs": [{"conclusion": "failure"}]}' ;;
      running) body='{"check_runs": [{"conclusion": null}]}' ;;
      mixed) body='{"check_runs": [{"conclusion": "success"}, {"conclusion": "failure"}]}' ;;
      none) body='{"check_runs": []}' ;;
    esac
    [ "$out" != - ] || echo "$body" ;;
  http://127.0.0.1*) code=$(app) ;;
  https://alumni.test*)
    case "$(s public up)" in
      up) code=$(app) ;;
      down) code=000 ;;
      drops-after-ready) case "$url" in *health*) code=$(app) ;; *) code=000 ;; esac ;;
    esac ;;
esac
[ "$write" = 0 ] || echo "$code"
[ "$code" != 000 ] || exit 7
if [ "$fail" = 1 ] && [ "$code" -ge 400 ]; then exit 22; fi
exit 0
`;

type Sandbox = {
  deploy: string;
  state: string;
  metrics: string;
  script: string;
  processEnv: NodeJS.ProcessEnv;
  set: (name: string, value?: string) => void;
  env: (name: string) => string;
  calls: () => string;
  log: () => string;
  deploySh: (...args: string[]) => number | null;
  run: () => { status: number | null; stderr: string };
};

const sandboxes: string[] = [];
afterEach(() => {
  for (const dir of sandboxes.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

function imageLines(sha: string, key: (name: string) => string) {
  return IMAGES.map(
    (name) => `${key(name)}=ghcr.io/owner/alumini-${name}@sha256:${sha}`
  );
}

function sandbox(
  options: { head?: string; live?: string; env?: string[] } = {}
): Sandbox {
  const dir = mkdtempSync(path.join(tmpdir(), "auto-deploy-"));
  sandboxes.push(dir);
  const bin = path.join(dir, "bin");
  const deploy = path.join(dir, "deploy");
  const state = path.join(dir, "state");
  const metrics = path.join(dir, "metrics");
  for (const name of [bin, deploy, state, metrics]) mkdirSync(name);

  const stub = (name: string, body: string) => {
    writeFileSync(path.join(bin, name), body);
    chmodSync(path.join(bin, name), 0o755);
  };
  stub("docker", DOCKER);
  stub("git", GIT);
  stub("curl", CURL);
  stub("sleep", "#!/bin/sh\nexit 0\n");
  for (const file of ["auto-deploy.sh", "deploy.sh"])
    copyFileSync(path.join(root, "deploy", file), path.join(deploy, file));

  const live = options.live ?? OLD;
  writeFileSync(
    path.join(deploy, ".env"),
    [
      "DEPLOY_ENV=production",
      "RELEASE_SOURCE=ci",
      "IMAGE_REGISTRY=ghcr.io/owner",
      "APP_URL=https://alumni.test",
      "SMOKE_EMAIL=smoke@alumni.test",
      "SMOKE_PASSWORD=abc123",
      `RELEASE_SHA=${live}`,
      ...imageLines(live, (name) => `${name.toUpperCase()}_IMAGE`),
      ...(options.env ?? []),
      "",
    ].join("\n")
  );
  if (live)
    writeFileSync(
      path.join(deploy, "releases.log"),
      `2026-11-01T00:00:00Z sha=${live} env=production source=pull ${imageLines(live, (name) => name).join(" ")} smoke=pass by=krotrn was=none\n`
    );

  const set = (name: string, value = "") =>
    writeFileSync(path.join(state, name), value ? `${value}\n` : "");
  set("head", options.head ?? NEW);
  set("clone", live);

  const script = path.join(deploy, "auto-deploy.sh");
  const inherited = { ...process.env };
  const processEnv = {
    ...inherited,
    PATH: `${bin}:${inherited.PATH ?? ""}`,
    STATE: state,
    BACKUP_METRICS_DIR: metrics,
    AUTO_DEPLOY_NET_TIMEOUT_S: "1",
  };

  return {
    deploy,
    state,
    metrics,
    script,
    processEnv,
    set,
    env: (name) =>
      readFileSync(path.join(deploy, ".env"), "utf8").match(
        new RegExp(`^${name}=(.*)$`, "m")
      )?.[1] ?? "",
    calls: () => {
      const file = path.join(state, "calls");
      return existsSync(file) ? readFileSync(file, "utf8") : "";
    },
    log: () => {
      const file = path.join(deploy, "releases.log");
      return existsSync(file) ? readFileSync(file, "utf8") : "";
    },
    deploySh: (...args) =>
      spawnSync(path.join(deploy, "deploy.sh"), args, {
        cwd: deploy,
        env: processEnv,
      }).status,
    run: () => {
      const result = spawnSync(script, {
        cwd: deploy,
        encoding: "utf8",
        env: processEnv,
      });
      return { status: result.status, stderr: result.stderr };
    },
  };
}

const marker = (box: Sandbox, name: string) =>
  existsSync(path.join(box.deploy, name));
const metric = (box: Sandbox) =>
  readFileSync(
    path.join(box.metrics, "alumini_auto_deploy_state.prom"),
    "utf8"
  );
const lastLine = (box: Sandbox) => box.log().trim().split("\n").pop() ?? "";

function assertNotReleased(box: Sandbox) {
  assert.equal(box.env("RELEASE_SHA"), OLD);
  assert.doesNotMatch(box.calls(), /compose up/);
  assert.doesNotMatch(box.calls(), /compose run/);
}

function assertReleased(box: Sandbox, sha = NEW) {
  assert.equal(box.env("RELEASE_SHA"), sha);
  assert.match(lastLine(box), new RegExp(`sha=${sha} .*source=pull`));
  assert.ok(!marker(box, ".auto-deploy-inflight"));
}

void describe("waits until all of CI passed", () => {
  void it("does nothing when the live release is the newest commit", () => {
    const box = sandbox({ head: OLD });
    assert.equal(box.run().status, 0);
    assertNotReleased(box);
    assert.doesNotMatch(box.calls(), /api\.github\.com/);
    assert.match(metric(box), /pending_since_timestamp_seconds 0/);
  });

  void it("releases a commit whose CI OK succeeded and whose images all exist", () => {
    const box = sandbox();
    assert.equal(box.run().status, 0);
    assertReleased(box);
    assert.match(lastLine(box), /smoke=pass /);
    assert.match(box.calls(), /compose run --rm migrate/);
  });

  for (const ci of ["running", "none", "failure", "mixed"])
    void it(`waits, without asking the registry, while CI OK is ${ci}`, () => {
      const box = sandbox();
      box.set("ci", ci);
      box.set("manifest-web", "ok");
      assert.equal(box.run().status, 0);
      assertNotReleased(box);
      assert.doesNotMatch(box.calls(), /manifest inspect/);
    });

  void it("releases after a failed CI run is re-run and passes", () => {
    const box = sandbox();
    box.set("ci", "failure");
    box.run();
    assertNotReleased(box);
    box.set("ci", "success");
    assert.equal(box.run().status, 0);
    assertReleased(box);
  });

  for (const name of IMAGES)
    void it(`waits while the ${name} image is missing`, () => {
      const box = sandbox();
      box.set(`manifest-${name}`, "unknown");
      assert.equal(box.run().status, 0);
      assertNotReleased(box);
    });

  void it("does not release a published image whose CI OK failed", () => {
    const box = sandbox();
    box.set("ci", "failure");
    box.run();
    assertNotReleased(box);
    assert.doesNotMatch(box.calls(), /docker pull/);
  });

  void it("releases nothing while the newest commit is red, then the next green one", () => {
    const box = sandbox();
    box.set("ci", "failure");
    box.run();
    assertNotReleased(box);
    box.set("head", NEWER);
    box.set("ci", "success");
    assert.equal(box.run().status, 0);
    assertReleased(box, NEWER);
    assert.doesNotMatch(box.log(), new RegExp(`sha=${NEW}`));
  });

  void it("releases the commit it checked when main moves during the release", () => {
    const box = sandbox();
    box.set("moves-to", NEWER);
    assert.equal(box.run().status, 0);
    assertReleased(box, NEW);
    assert.doesNotMatch(box.log(), new RegExp(`sha=${NEWER}`));
    assert.match(box.calls(), new RegExp(`merge --quiet --ff-only ${NEW}`));
  });

  void it("checks the moved commit on its own run", () => {
    const box = sandbox();
    box.set("moves-to", NEWER);
    box.run();
    box.set("ci", "failure");
    assert.equal(box.run().status, 0);
    assert.equal(box.env("RELEASE_SHA"), NEW);
  });
});

void describe("server off or no internet", () => {
  void it("waits while the live release is still starting after boot", () => {
    const box = sandbox();
    box.set("app", "down");
    assert.equal(box.run().status, 0);
    assertNotReleased(box);
    assert.doesNotMatch(box.calls(), /git ls-remote/);
  });

  void it("catches up when the connection returns", () => {
    const box = sandbox();
    box.set("network", "down");
    assert.equal(box.run().status, 0);
    assertNotReleased(box);
    box.set("network", "up");
    assert.equal(box.run().status, 0);
    assertReleased(box);
  });

  void it("waits when GitHub cannot be reached", () => {
    const box = sandbox();
    for (const code of ["000", "403", "429", "503"]) {
      box.set("ci-http", code);
      assert.equal(box.run().status, 0, code);
    }
    assertNotReleased(box);
  });

  void it("waits when the registry cannot be reached", () => {
    const box = sandbox();
    box.set("manifest-worker", "offline");
    assert.equal(box.run().status, 0);
    assertNotReleased(box);
    assert.ok(!marker(box, ".auto-deploy-failed"));
  });

  void it("does not fail the commit when git fetch drops", () => {
    const box = sandbox();
    box.set("git-fetch", "fail");
    assert.equal(box.run().status, 0);
    assertNotReleased(box);
    assert.ok(!marker(box, ".auto-deploy-failed"));
    assert.ok(!marker(box, ".auto-deploy-inflight"));
    box.set("git-fetch", "ok");
    assert.equal(box.run().status, 0);
    assertReleased(box);
  });

  void it("does not fail the commit when docker pull drops", () => {
    const box = sandbox();
    box.set("pull", "fail");
    assert.equal(box.run().status, 0);
    assertNotReleased(box);
    assert.ok(!marker(box, ".auto-deploy-failed"));
    box.set("pull", "ok");
    assert.equal(box.run().status, 0);
    assertReleased(box);
  });

  void it("gives up on a hung connection and waits", () => {
    const box = sandbox();
    box.set("network", "hang");
    assert.equal(box.run().status, 0);
    assertNotReleased(box);
  });

  void it("keeps a good release when the public URL is unreachable", () => {
    const box = sandbox();
    box.set("public", "down");
    assert.equal(box.run().status, 0);
    assertReleased(box);
    assert.match(lastLine(box), /smoke=pass-local /);
    assert.doesNotMatch(box.calls(), /deploy rollback/);
  });

  void it("keeps a good release when the connection drops partway through the smoke test", () => {
    const box = sandbox();
    box.set("public", "drops-after-ready");
    assert.equal(box.run().status, 0);
    assertReleased(box);
    assert.match(lastLine(box), /smoke=pass-local /);
  });

  void it("still fails a bad release when the public URL is unreachable", () => {
    const box = sandbox();
    box.set("public", "down");
    box.set("bad", NEW);
    box.set("bad-mode", "signin");
    assert.equal(box.run().status, 1);
    assert.equal(box.env("RELEASE_SHA"), OLD);
  });

  void it("keeps the last known state through an offline run", () => {
    const box = sandbox();
    box.set("migrate", "fail");
    box.run();
    assert.match(metric(box), /alumini_auto_deploy_blocked 1/);
    const check = path.join(box.metrics, "alumini_auto_deploy_check.prom");
    rmSync(check);
    box.set("network", "down");
    box.run();
    assert.match(metric(box), /alumini_auto_deploy_blocked 1/);
    assert.ok(!existsSync(check));
  });
});

void describe("bad releases roll back and are not retried", () => {
  void it("leaves the previous release running when a migration fails", () => {
    const box = sandbox();
    box.set("migrate", "fail");
    assert.equal(box.run().status, 1);
    assert.equal(box.env("RELEASE_SHA"), OLD);
    assert.doesNotMatch(box.calls(), /compose up/);
    assert.equal(
      readFileSync(path.join(box.deploy, ".auto-deploy-failed"), "utf8").trim(),
      NEW
    );
    assert.match(metric(box), /alumini_auto_deploy_blocked 1/);
  });

  void it("rolls back a release that never becomes ready", () => {
    const box = sandbox();
    box.set("bad", NEW);
    assert.equal(box.run().status, 1);
    assert.equal(box.env("RELEASE_SHA"), OLD);
    assert.match(lastLine(box), new RegExp(`sha=${OLD} .*source=rollback`));
  });

  void it("rolls back a release that fails the smoke test", () => {
    const box = sandbox();
    box.set("bad", NEW);
    box.set("bad-mode", "signin");
    assert.equal(box.run().status, 1);
    assert.equal(box.env("RELEASE_SHA"), OLD);
    assert.match(box.log(), new RegExp(`sha=${NEW} .*smoke=fail`));
    assert.match(lastLine(box), /source=rollback .*smoke=pass /);
  });

  void it("does not try a failed commit again", () => {
    const box = sandbox();
    box.set("migrate", "fail");
    box.run();
    rmSync(path.join(box.state, "calls"));
    box.set("migrate", "ok");
    assert.equal(box.run().status, 0);
    assertNotReleased(box);
    assert.match(metric(box), /alumini_auto_deploy_blocked 1/);
  });

  void it("reports a rollback that fails and tries it again on the next run", () => {
    const box = sandbox();
    box.set("broken");
    assert.equal(box.run().status, 1);
    assert.ok(marker(box, ".auto-deploy-inflight"));
    assert.match(metric(box), /alumini_auto_deploy_blocked 1/);
    rmSync(path.join(box.state, "broken"));
    box.run();
    assert.equal(box.env("RELEASE_SHA"), OLD);
    assert.ok(!marker(box, ".auto-deploy-inflight"));
  });

  void it("releases the next commit after a failed one", () => {
    const box = sandbox();
    box.set("bad", NEW);
    box.run();
    box.set("head", NEWER);
    assert.equal(box.run().status, 0);
    assertReleased(box, NEWER);
    assert.ok(!marker(box, ".auto-deploy-failed"));
    assert.match(metric(box), /alumini_auto_deploy_blocked 0/);
  });
});

void describe("power cuts and conflicts", () => {
  const moveEnvTo = (box: Sandbox, sha: string) => {
    const env = path.join(box.deploy, ".env");
    writeFileSync(env, readFileSync(env, "utf8").replaceAll(OLD, sha));
  };
  const interrupted = (box: Sandbox) =>
    writeFileSync(
      path.join(box.deploy, ".auto-deploy-inflight"),
      `${NEW} ${OLD}\n`
    );

  void it("stays on the live release when power failed before anything changed", () => {
    const box = sandbox();
    interrupted(box);
    assert.equal(box.run().status, 0);
    assert.equal(box.env("RELEASE_SHA"), OLD);
    assert.ok(!marker(box, ".auto-deploy-inflight"));
  });

  void it("returns to the last release when power failed after .env moved, then moves forward", () => {
    const box = sandbox();
    interrupted(box);
    moveEnvTo(box, NEW);
    assert.equal(box.run().status, 0);
    assert.equal(box.env("RELEASE_SHA"), OLD);
    assert.match(box.env("WEB_IMAGE"), new RegExp(OLD));
    assert.match(box.calls(), /compose up/);
    assert.equal(box.run().status, 0);
    assertReleased(box);
  });

  void it("does not roll back a release that finished just before the power failed", () => {
    const box = sandbox();
    box.run();
    assertReleased(box);
    interrupted(box);
    rmSync(path.join(box.state, "calls"));
    assert.equal(box.run().status, 0);
    assert.equal(box.env("RELEASE_SHA"), NEW);
    assert.doesNotMatch(box.calls(), /compose up/);
  });

  void it("marks the commit failed when a cut-off migration blocks the retry", () => {
    const box = sandbox();
    interrupted(box);
    assert.equal(box.run().status, 0);
    box.set("migrate", "fail");
    assert.equal(box.run().status, 1);
    assert.equal(box.env("RELEASE_SHA"), OLD);
    assert.ok(marker(box, ".auto-deploy-failed"));
  });

  void it("waits while another release holds the lock", () => {
    const box = sandbox();
    const lock = path.join(box.deploy, ".deploy.lock");
    writeFileSync(lock, "");
    const holder = spawnSync(
      "bash",
      ["-c", 'exec 9> "$0"; flock 9; exec "$1"', lock, box.script],
      { cwd: box.deploy, encoding: "utf8", env: box.processEnv }
    );
    assert.equal(holder.status, 0);
    assert.equal(box.env("RELEASE_SHA"), OLD);
    assert.ok(!marker(box, ".auto-deploy-failed"));
  });

  void it("reports a clone with local changes, then releases once it is clean", () => {
    const box = sandbox();
    box.set("dirty", " M deploy/compose.yml");
    assert.equal(box.run().status, 1);
    assertNotReleased(box);
    assert.match(metric(box), /alumini_auto_deploy_blocked 1/);
    assert.ok(!marker(box, ".auto-deploy-failed"));
    assert.ok(!marker(box, ".auto-deploy-inflight"));
    box.set("dirty");
    assert.equal(box.run().status, 0);
    assertReleased(box);
  });

  void it("recovers from a marker cut off while it was written", () => {
    const box = sandbox();
    writeFileSync(path.join(box.deploy, ".auto-deploy-inflight"), "");
    assert.equal(box.run().status, 0);
    assertReleased(box);
  });

  void it("does not retry a release whose smoke test failed before the power did", () => {
    const box = sandbox();
    interrupted(box);
    moveEnvTo(box, NEW);
    writeFileSync(
      path.join(box.deploy, "releases.log"),
      `${box.log()}2026-11-02T00:00:00Z sha=${NEW} env=production source=pull smoke=fail by=krotrn was=${OLD}\n`
    );
    assert.equal(box.run().status, 0);
    assert.equal(box.env("RELEASE_SHA"), OLD);
    rmSync(path.join(box.state, "calls"));
    assert.equal(box.run().status, 0);
    assertNotReleased(box);
    assert.match(metric(box), /alumini_auto_deploy_blocked 1/);
  });

  void it("stops retrying a release that keeps being cut off", () => {
    const box = sandbox();
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      interrupted(box);
      moveEnvTo(box, NEW);
      assert.equal(box.run().status, 0);
      assert.equal(box.env("RELEASE_SHA"), OLD);
    }
    rmSync(path.join(box.state, "calls"));
    assert.equal(box.run().status, 0);
    assertNotReleased(box);
    assert.match(metric(box), /alumini_auto_deploy_blocked 1/);
  });

  void it("does not count a pull cut off by the network against the commit", () => {
    const box = sandbox();
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      interrupted(box);
      assert.equal(box.run().status, 0);
    }
    assert.ok(!marker(box, ".auto-deploy-failed"));
    assert.equal(box.run().status, 0);
    assertReleased(box);
  });

  void it("does not undo a person's rollback", () => {
    const box = sandbox();
    box.run();
    assertReleased(box);
    assert.equal(box.deploySh("rollback", OLD), 0);
    assert.equal(box.env("RELEASE_SHA"), OLD);
    assert.equal(box.run().status, 0);
    assert.equal(box.env("RELEASE_SHA"), OLD);
    box.set("head", NEWER);
    assert.equal(box.run().status, 0);
    assertReleased(box, NEWER);
  });

  void it("warns when it cannot write the metrics", () => {
    const box = sandbox({ env: [] });
    rmSync(box.metrics, { recursive: true });
    box.set("network", "up");
    const { status, stderr } = box.run();
    assert.equal(status, 0);
    assert.match(stderr, /not writable/);
  });

  void it("reports a clone that diverged instead of releasing the old commit again", () => {
    const box = sandbox();
    box.set("diverged", "yes");
    assert.equal(box.run().status, 1);
    assertNotReleased(box);
    assert.ok(!marker(box, ".auto-deploy-failed"));
  });

  for (const answer of ["denied", "unauthorized"])
    void it(`reports a registry that answers ${answer}, not as offline`, () => {
      const box = sandbox();
      box.set("manifest-web", answer);
      assert.equal(box.run().status, 1);
      assertNotReleased(box);
      assert.match(metric(box), /alumini_auto_deploy_blocked 1/);
    });

  void it("reports a repository GitHub will not show", () => {
    const box = sandbox();
    box.set("ci-http", "404");
    assert.equal(box.run().status, 1);
    assertNotReleased(box);
  });

  void it("refuses the first release", () => {
    const box = sandbox({ live: "" });
    const { status, stderr } = box.run();
    assert.equal(status, 1);
    assert.match(stderr, /by hand first/);
    assert.doesNotMatch(box.calls(), /compose/);
  });

  void it("refuses to run without a smoke account", () => {
    const box = sandbox({ env: ["SMOKE_EMAIL="] });
    const { status, stderr } = box.run();
    assert.equal(status, 1);
    assert.match(stderr, /SMOKE_EMAIL/);
  });
});

void describe("staleness metrics", () => {
  void it("records how long the host has been behind main", () => {
    const box = sandbox();
    box.set("ci", "running");
    box.run();
    assert.match(metric(box), /pending_since_timestamp_seconds [1-9]\d+/);
    const first = readFileSync(
      path.join(box.deploy, ".auto-deploy-pending"),
      "utf8"
    );
    box.run();
    assert.equal(
      readFileSync(path.join(box.deploy, ".auto-deploy-pending"), "utf8"),
      first
    );
  });

  void it("clears it once the release is live", () => {
    const box = sandbox();
    box.set("ci", "running");
    box.run();
    box.set("ci", "success");
    box.run();
    box.set("head", NEW);
    box.run();
    assert.match(metric(box), /pending_since_timestamp_seconds 0/);
  });

  void it("does not count an offline run as a check", () => {
    const box = sandbox();
    box.set("network", "down");
    box.run();
    assert.ok(
      !existsSync(path.join(box.metrics, "alumini_auto_deploy_check.prom"))
    );
  });
});
