export default function Home() {
  return (
    <main className="min-h-screen bg-[#fafaf8] text-[#1a1614] font-sans selection:bg-red-100 selection:text-red-700">
      {/* Subtle grain texture overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />

      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-red-500/5 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[30vw] h-[30vw] rounded-full bg-red-400/5 blur-[100px]" />
      </div>

      {/* Release banner */}
      <div className="relative z-20 w-full border-b border-[#ede8e4] bg-white/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-6 md:px-8 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="shrink-0 text-[10px] font-semibold tracking-widest uppercase bg-red-600 text-white px-2 py-0.5 rounded-full">
              New
            </span>
            <span className="text-sm text-[#3d3230] truncate">
              Beta <span className="font-semibold text-[#1a1614]">v1.0.1</span>{" "}
              is released
            </span>
          </div>
          <a
            href="https://l.devwtf.in/unitime-apk"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 transition-colors"
          >
            Download
            <span className="text-base leading-none">↓</span>
          </a>
        </div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-20 md:px-8 md:py-28">
        {/* Header */}
        <header className="mb-20">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs tracking-[0.2em] uppercase text-red-500 font-mono">
              Beta · Open Source
            </span>
          </div>
          <h1 className="font-lora text-5xl md:text-6xl font-bold tracking-tight text-[#1a1614] mt-4">
            UNi<span className="text-red-600">TIME</span>
          </h1>
          <p className="text-[#6b5f5a] mt-3 text-sm tracking-wide">
            A class management platform for universities.
          </p>
        </header>

        {/* Hero Statement */}
        <section className="mb-16">
          <p className="text-lg md:text-xl leading-relaxed text-[#3d3230] mb-6">
            <strong className="text-[#1a1614] font-semibold">UNiTIME</strong> is
            a class management platform designed for universities, colleges,
            schools, and educational institutions of all kinds. Right now, the
            app is focused exclusively on{" "}
            <strong className="text-[#1a1614] font-semibold">
              Galgotias University
            </strong>
            —because we are students here and have personally experienced
            multiple limitations and frustrations with the current iCloud app.
          </p>

          <div className="border-l-2 border-red-400/50 pl-5 py-2 my-8 bg-red-50/60 rounded-r-lg">
            <p className="text-[#6b5f5a] italic text-base leading-relaxed">
              Can we truly deliver a better experience than iCloud?
            </p>
            <p className="text-[#1a1614] font-semibold text-base mt-2">
              Our answer today is a confident{" "}
              <span className="text-red-600">Yes.</span>
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-3 mt-8">
            <a
              href="https://l.devwtf.in/unitime-apk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-600 text-white font-semibold text-sm hover:bg-red-700 active:scale-95 transition-all duration-150 shadow-lg shadow-red-600/20"
            >
              <span>↓</span>
              Download Beta APK
            </a>
            <a
              href="https://git.new/unitime"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#ddd8d4] text-[#6b5f5a] text-sm hover:text-[#1a1614] hover:border-[#bbb5b0] transition-all duration-150 bg-white"
            >
              <GitIcon />
              View Source Code
            </a>
          </div>
        </section>

        <Divider />

        {/* Features */}
        <section className="mb-16">
          <SectionLabel>What&apos;s Inside?</SectionLabel>
          <p className="text-[#3d3230] leading-relaxed mb-8">
            UNiTIME is built to empower everyone in the classroom. Here is what you can do based on your role:
          </p>
          
          <div className="flex flex-col gap-10">
            <RoleSection 
              title="👨‍🎓 Students" 
              features={[
                { name: "Profile & onboarding", detail: "Create and fetch own student profile." },
                { name: "Courses & timetable", detail: "Request course enrollment and see enrolled courses. View personal weekly timetable and per-day timetable (lecture + lab-group–specific slots)." },
                { name: "Attendance", detail: "Join QR/tap/manual attendance sessions and see own attendance summary per course." },
                { name: "Feedback & support", detail: "Submit feedback. Create support tickets and track their status." }
              ]}
            />
            
            <RoleSection 
              title="⭐ Class Representatives" 
              description="Everything students can do, plus:"
              features={[
                { name: "Timetable management", detail: "Create, update, and delete timetable entries (for their class/lab groups)." },
                { name: "Lab groups", detail: "Create lab groups for a course/org. Delete empty lab groups. View members of a given lab group." }
              ]}
            />
            
            <RoleSection 
              title="👨‍🏫 Professors" 
              description="Everything students can do, plus:"
              features={[
                { name: "Attendance control", detail: "Create QR attendance sessions for their courses. View the list of students in a given attendance session." },
                { name: "Lab groups", detail: "View members of a given lab group." }
              ]}
            />
          </div>
        </section>

        <Divider />

        {/* Privacy & Trust */}
        <section className="mb-16">
          <SectionLabel>Privacy &amp; Trust</SectionLabel>

          <p className="text-[#3d3230] leading-relaxed mb-5">
            At this stage, UNiTIME is still in active development. We are
            currently promoting the app through WhatsApp groups and internal
            student networks, and it has not yet been officially published on
            the Play Store or App Store.
          </p>
          <p className="text-[#3d3230] leading-relaxed mb-5">
            Naturally, this can raise concerns. Downloading an APK file from an
            unknown source requires trust, and we completely understand that
            hesitation.
          </p>
          <p className="text-[#3d3230] leading-relaxed mb-8">
            That&apos;s exactly why we&apos;ve chosen a different path.
          </p>

          <div className="bg-white border border-[#e8e2de] rounded-xl p-6 mb-8 shadow-sm">
            <p className="text-[#3d3230] leading-relaxed">
              To maintain full transparency with our users, we have decided to
              make UNiTIME{" "}
              <a
                href="https://git.new/unitime"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-600 underline underline-offset-2 hover:text-red-700 transition-colors"
              >
                open source
              </a>{" "}
              during this phase. This means anyone—technical or
              non-technical—can review our source code, verify how the app
              works, and confirm that there is absolutely no malicious or
              unethical functionality involved.
            </p>
            <p className="text-[#1a1614] font-semibold mt-4">
              And to be clear:{" "}
              <span className="text-red-600">
                there isn&apos;t—and there never will be.
              </span>
            </p>
          </div>

          {/* Security callout */}
          <div className="border border-red-200 bg-red-50/70 rounded-xl p-5">
            <div className="flex gap-3">
              <span className="text-red-500 text-lg mt-0.5 shrink-0">⚠</span>
              <div>
                <p className="text-[#3d3230] text-sm leading-relaxed">
                  While downloading our app&apos;s APK file or any future
                  updates, always verify that the download link includes{" "}
                  <code className="bg-white text-red-600 border border-red-100 px-1.5 py-0.5 rounded text-xs font-mono">
                    devwtf.in
                  </code>{" "}
                  in its URL.
                </p>
                <div className="mt-3 flex flex-col gap-1">
                  <VerifiedLink href="https://unitime.devwtf.in/beta">
                    unitime.devwtf.in/beta
                  </VerifiedLink>
                  <VerifiedLink href="https://l.devwtf.in/unitime-apk">
                    l.devwtf.in/unitime-apk
                  </VerifiedLink>
                </div>
                <p className="text-[#9d8f8a] text-xs mt-3 italic">
                  If the link doesn&apos;t include devwtf.in — it&apos;s not the
                  real app and doesn&apos;t belong to us.
                </p>
              </div>
            </div>
          </div>
        </section>

        <Divider />

        {/* Ownership */}
        <section className="mb-16">
          <SectionLabel>Ownership &amp; Responsibility</SectionLabel>

          <p className="text-[#3d3230] leading-relaxed mb-6">
            UNiTIME is currently developed and maintained by a single
            owner/contributor. I personally take full responsibility for the
            application and for the safety and privacy of all user data. Any
            issues, concerns, or feedback ultimately fall under my direct
            accountability.
          </p>

          <p className="text-[#3d3230] leading-relaxed">
            Name: <strong className="text-[#1a1614]">Saidev Dhal</strong>
          </p>
          <p className="text-[#3d3230] leading-relaxed mt-1">
            Admission No:{" "}
            <code className="font-mono text-sm text-[#6b5f5a]">
              25SCSE1680001
            </code>
          </p>
          <p className="text-[#3d3230] leading-relaxed mt-1">
            University Email:{" "}
            <a
              href="mailto:Saidev.25SCSE1680001@galgotiasuniversity.ac.in"
              className="text-red-600 hover:text-red-700 underline underline-offset-2 transition-colors break-all"
            >
              Saidev.25SCSE1680001@galgotiasuniversity.ac.in
            </a>
          </p>
          <p className="text-[#3d3230] leading-relaxed mt-1">
            Contact:{" "}
            <a
              href="https://l.devwtf.in/wp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-600 hover:text-red-700 underline underline-offset-2 transition-colors"
            >
              l.devwtf.in/wp
            </a>
          </p>
        </section>

        <Divider />

        {/* Feedback & Suggestions */}
        <section className="mb-16">
          <SectionLabel>Feedback &amp; Suggestions</SectionLabel>

          <p className="text-[#3d3230] leading-relaxed mb-6">
            UNiTIME is being built in the open, and your feedback directly
            shapes what gets built next. Found a bug? Have an idea? Or just want
            to follow along and share your thoughts with other students?
          </p>
          <p className="text-[#3d3230] leading-relaxed mb-8">
            Join our WhatsApp community — it&apos;s the fastest way to reach us
            and the best place to stay updated on new releases.
          </p>

          <a
            href="https://chat.whatsapp.com/G601WXeqmrw5xgEYPgLiZZ?mode=gi_t"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-red-600 text-white font-semibold text-sm hover:bg-red-700 active:scale-95 transition-all duration-150 shadow-lg shadow-red-600/20"
          >
            <WhatsAppIcon />
            Join the Community
          </a>
        </section>

        <Divider />

        <footer className="text-center py-4">
          <p className="font-lora text-lg md:text-xl text-[#9d8f8a] italic leading-relaxed">
            &ldquo;Made for the students, <br className="hidden sm:block" />
            by the students of{" "}
            <span className="text-red-500/70">Galgotias University</span>
            .&rdquo;
          </p>
          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-[#c0b8b2]">
            <a
              href="https://git.new/unitime"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#6b5f5a] transition-colors"
            >
              GitHub
            </a>
            <span>·</span>
            <a
              href="https://l.devwtf.in/unitime-apk"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#6b5f5a] transition-colors"
            >
              Download APK
            </a>
            <span>·</span>
            <a
              href="https://l.devwtf.in/wp"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#6b5f5a] transition-colors"
            >
              Contact
            </a>
          </div>
          <p className="text-[#ddd8d4] text-xs mt-6">
            © {new Date().getFullYear()} UNiTIME · Open Source Beta
          </p>
        </footer>
      </div>
    </main>
  );
}

/* ── Reusable tiny components ── */

function Divider() {
  return (
    <div className="my-12 flex items-center gap-4">
      <div className="flex-1 h-px bg-linear-to-r from-transparent to-[#e8e2de]" />
      <div className="w-1 h-1 rounded-full bg-[#ddd8d4]" />
      <div className="flex-1 h-px bg-linear-to-l from-transparent to-[#e8e2de]" />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-lora text-2xl md:text-3xl font-bold text-[#1a1614] mb-6 tracking-tight">
      {children}
    </h2>
  );
}

function VerifiedLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 group"
    >
      <span className="text-green-500 text-xs">✓</span>
      <code className="text-xs font-mono text-red-600/70 group-hover:text-red-600 transition-colors underline underline-offset-2 decoration-red-300/50">
        {children}
      </code>
    </a>
  );
}

function GitIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function RoleSection({ 
  title, 
  description, 
  features,
}: { 
  title: string; 
  description?: string; 
  features: { name: string; detail: string; }[];
}) {
  return (
    <div>
      <h3 className="text-[#1a1614] font-bold text-lg mb-1">{title}</h3>
      {description && <p className="text-[#3d3230] text-sm mb-3 italic">{description}</p>}
      {!description && <div className="h-2" />}
      
      <ul className="space-y-3">
        {features.map((f, i) => (
          <li key={i} className="flex gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
            <div>
              <span className="font-semibold text-[#1a1614]">{f.name}: </span>
              <span className="text-[#3d3230] leading-relaxed">{f.detail}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
