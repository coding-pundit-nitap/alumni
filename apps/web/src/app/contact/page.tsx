import type { Metadata } from "next";
import Link from "next/link";

import { CAMPUS_PHOTOS } from "@/components/brand/campus-photos";
import { LegalPage, LegalSection } from "@/components/common/legal-page";
import { PublicShell } from "@/components/common/public-shell";
import { listContactCoordinators } from "@/composition/admin";
import { legalConfig } from "@/config/legal";
import { publicPageMetadata } from "@/lib/seo";
import {
  COORDINATOR_GROUPS,
  coordinatorPhotoUrl,
  telHref,
  type ContactCoordinator,
} from "@/modules/admin";
import { getActor } from "@/modules/auth";

export const metadata: Metadata = publicPageMetadata({
  title: "Contact",
  description:
    "How to reach the NIT Arunachal Pradesh alumni office, and where to go for account, content and privacy questions.",
  path: "/contact",
});

function CoordinatorCard({ person }: { person: ContactCoordinator }) {
  const photo = coordinatorPhotoUrl(person);
  return (
    <div className="flex min-w-0 gap-4">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- redirects to a short-lived signed URL.
        <img
          src={photo}
          alt=""
          loading="lazy"
          className="bg-muted size-16 shrink-0 rounded-full object-cover"
        />
      ) : null}
      <div className="min-w-0">
        <p className="text-foreground font-medium">{person.name}</p>
        {person.designation ? <p>{person.designation}</p> : null}
        {person.email ? (
          <p className="break-words">
            <a href={`mailto:${person.email}`}>{person.email}</a>
          </p>
        ) : null}
        {person.phone ? (
          <p>
            <a href={telHref(person.phone)}>{person.phone}</a>
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Office details come from config/legal.ts; admins manage the coordinators at
 * /admin/coordinators.
 */
export default async function ContactPage() {
  const [actor, coordinators] = await Promise.all([
    getActor(),
    listContactCoordinators(),
  ]);
  const signedIn = actor !== null;
  const groups = COORDINATOR_GROUPS.map((group) => ({
    ...group,
    people: coordinators.filter((person) => person.kind === group.kind),
  })).filter((group) => group.people.length > 0);
  const office = legalConfig.alumniOffice;
  const lines = [
    {
      term: "Email",
      value: office.email ? (
        <a href={`mailto:${office.email}`}>{office.email}</a>
      ) : null,
    },
    { term: "Phone", value: office.phone },
    { term: "Address", value: office.address },
    { term: "Hours", value: office.hours },
  ].filter((line) => line.value != null);

  return (
    <PublicShell signedIn={signedIn}>
      <LegalPage
        title="Contact"
        photo={CAMPUS_PHOTOS.academicBlocks}
        intro={
          <p>
            The alumni office at NIT Arunachal Pradesh runs this network. Many
            questions can be answered in the app itself; the sections below say
            where.
          </p>
        }
      >
        <LegalSection id="office" title="Alumni office">
          {lines.length > 0 ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
              {lines.map((line) => (
                <div key={line.term} className="contents">
                  <dt className="text-foreground font-medium">{line.term}</dt>
                  <dd>{line.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>
              The institute will publish the office&rsquo;s contact details
              here.
            </p>
          )}
        </LegalSection>

        {groups.length > 0 ? (
          <LegalSection id="coordinators" title="Coordinators">
            <div className="space-y-8">
              {groups.map((group) => (
                <div key={group.kind} className="space-y-4">
                  <h3 className="text-foreground font-medium">{group.title}</h3>
                  <div className="grid gap-6 sm:grid-cols-2">
                    {group.people.map((person) => (
                      <CoordinatorCard key={person.id} person={person} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </LegalSection>
        ) : null}

        <LegalSection id="account" title="Signing in and verification">
          <ul>
            <li>
              Forgot your password?{" "}
              <Link href="/forgot-password">Reset it</Link>.
            </li>
            <li>
              Waiting for verification, or asked to resubmit? Sign in to see
              your request&rsquo;s status and the reviewer&rsquo;s note.
            </li>
            <li>
              Your department, degree or graduation year is wrong? These are set
              by the institute; write to the alumni office.
            </li>
          </ul>
        </LegalSection>

        <LegalSection id="content" title="Reporting a post, comment or member">
          <p>
            Use <strong>Report</strong> on the post, comment or message. A
            moderator reviews every report. If someone is in danger, contact the
            police first.
          </p>
        </LegalSection>

        <LegalSection id="privacy" title="Privacy and your data">
          <p>
            You choose who sees your profile in your privacy settings. For a
            copy of your data, a correction or deletion, write to the alumni
            office.
          </p>
        </LegalSection>

        <LegalSection id="security" title="Security problems">
          <p>
            Found a security problem in the network? Write to the alumni office
            with the details, and please do not share them publicly until it is
            fixed.
          </p>
        </LegalSection>
      </LegalPage>
    </PublicShell>
  );
}
