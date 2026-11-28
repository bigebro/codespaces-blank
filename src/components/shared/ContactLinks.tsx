import { contactLinks } from "@/lib/contact";

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor">
      <path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.5h4V24h-4V8.5zM8.5 8.5h3.8v2.1h.05c.53-1 1.84-2.1 3.79-2.1 4.05 0 4.8 2.67 4.8 6.14V24h-4v-7.7c0-1.84-.03-4.2-2.56-4.2-2.56 0-2.95 2-2.95 4.06V24h-4V8.5z" />
    </svg>
  );
}

function Links({ layout }: { layout: "row" | "wide" | "card" }) {
  const { messengerUrl, linkedinUrl } = contactLinks();
  if (!messengerUrl && !linkedinUrl) return null;

  const wide = layout === "wide";
  return (
    <div
      className={
        wide
          ? "flex items-center gap-2"
          : layout === "card"
            ? "flex items-center justify-start gap-2"
            : "flex items-center justify-center gap-2"
      }
    >
      {messengerUrl ? (
        <a
          href={messengerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={
            wide
              ? "flex-1 bg-white hover:bg-zinc-200 text-zinc-950 font-black py-3 rounded-xl text-xs inline-flex justify-center items-center shadow"
              : "bg-white hover:bg-zinc-200 text-zinc-950 font-black px-4 py-2.5 rounded-xl text-xs inline-flex items-center justify-center shadow"
          }
        >
          Messenger-ээр бичих
        </a>
      ) : null}
      {linkedinUrl ? (
        <a
          href={linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500"
        >
          <LinkedInIcon />
        </a>
      ) : null}
    </div>
  );
}

export function ContactLinks({ layout = "row" }: { layout?: "row" | "wide" | "card" }) {
  const { messengerUrl, linkedinUrl } = contactLinks();
  if (!messengerUrl && !linkedinUrl) return null;

  if (layout === "card") {
    return (
      <section className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
        <h3 className={`text-base font-bold text-zinc-100 ${messengerUrl ? "" : "mb-4"}`}>
          Холбоо барих
        </h3>
        {messengerUrl ? (
          <p className="text-xs text-zinc-400 mt-1 mb-4">
            Асуух зүйл байвал Messenger-ээр бичээрэй.
          </p>
        ) : null}
        <Links layout="card" />
      </section>
    );
  }

  if (layout === "wide") {
    return (
      <div className="pt-4 border-t border-zinc-800">
        <Links layout="wide" />
      </div>
    );
  }

  return <Links layout={layout} />;
}
