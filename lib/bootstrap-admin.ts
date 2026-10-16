import bcrypt from "bcryptjs";
import { connectDB } from "./db";
import { User } from "@/models/User";

/**
 * Default administrator bootstrap.
 *
 * The operator account can live in two places: the environment (a break-glass
 * administrator defined by ADMIN_EMAIL / ADMIN_PASSWORD) and the users
 * collection. This module guarantees the database has at least one
 * administrator so a fresh deployment can be signed into without anyone
 * running a manual database step.
 *
 * The rules are deliberately narrow:
 *  - It only writes when the database currently holds **zero** administrators,
 *    so it can never overwrite, duplicate or downgrade an account that already
 *    exists.
 *  - Credentials are only ever taken from the environment. Nothing is invented,
 *    and no generated password is printed to the logs.
 *  - Without ADMIN_EMAIL plus ADMIN_PASSWORD (or ADMIN_PASSWORD_HASH) there is
 *    nothing safe to create, so it reports `skipped` and explains why rather
 *    than creating a guessable account.
 */

export type AdminBootstrapResult = {
  status: "created" | "promoted" | "existing" | "skipped";
  email?: string;
  reason?: string;
};

/** Shortest password the bootstrap will accept for the seeded account. */
const MIN_PASSWORD_LENGTH = 8;

function credentialsFromEnv() {
  return {
    email: (process.env.ADMIN_EMAIL || "").trim().toLowerCase(),
    password: process.env.ADMIN_PASSWORD || "",
    hash: (process.env.ADMIN_PASSWORD_HASH || "").trim(),
  };
}

/** True when at least one administrator record exists in the database. */
export async function adminExistsInDatabase(): Promise<boolean> {
  try {
    await connectDB();
    return (await User.countDocuments({ role: "admin" })) > 0;
  } catch (error) {
    console.error("[bootstrap-admin] could not check for an existing administrator", error);
    return false;
  }
}

export async function ensureDefaultAdmin(): Promise<AdminBootstrapResult> {
  const { email, password, hash } = credentialsFromEnv();

  if (!email) {
    return { status: "skipped", reason: "ADMIN_EMAIL is not set" };
  }
  if (!hash && password.length < MIN_PASSWORD_LENGTH) {
    return {
      status: "skipped",
      reason: `ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters (or set ADMIN_PASSWORD_HASH)`,
    };
  }

  await connectDB();

  if ((await User.countDocuments({ role: "admin" })) > 0) {
    return { status: "existing", email };
  }

  const existing = await User.findOne({ email });
  if (existing) {
    // Promote the account the operator nominated instead of creating a second
    // record for the same address — `email` is uniquely indexed.
    existing.role = "admin";
    await existing.save();
    return { status: "promoted", email };
  }

  const passwordHash = hash || (await bcrypt.hash(password, 10));
  await User.create({ name: "Administrator", email, password: passwordHash, role: "admin" });
  return { status: "created", email };
}

let inFlight: Promise<AdminBootstrapResult> | null = null;

/**
 * Cached bootstrap for request handling: at most one attempt per process.
 *
 * A `skipped` result is not cached, because the usual cause is a temporarily
 * unreachable database — retrying on the next request is the desired behaviour.
 */
export function ensureDefaultAdminOnce(): Promise<AdminBootstrapResult> {
  if (!inFlight) {
    inFlight = ensureDefaultAdmin()
      .then((result) => {
        if (result.status === "created" || result.status === "promoted") {
          console.log(
            `[bootstrap-admin] ${result.status} default administrator ${result.email} (no administrator existed, credentials taken from the environment)`
          );
        }
        if (result.status === "skipped") inFlight = null;
        return result;
      })
      .catch((error) => {
        console.error("[bootstrap-admin] could not create a default administrator", error);
        inFlight = null;
        return { status: "skipped" as const, reason: "database unavailable" };
      });
  }
  return inFlight;
}
