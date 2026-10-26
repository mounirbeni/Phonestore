"use client";

/** Last-resort screen if the root layout itself fails. Must render its own <html>. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#0d0d10", color: "#f5f5f6", fontFamily: "system-ui, sans-serif", textAlign: "center", padding: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Oups, un problème est survenu · عذرًا، حدثت مشكلة</h1>
          <p style={{ color: "#9a9aa4", margin: "0 0 20px" }}>Réessayez dans un instant · حاول مرة أخرى بعد قليل</p>
          <button onClick={reset} style={{ background: "#dc1a35", color: "#fff", border: 0, borderRadius: 14, padding: "14px 24px", fontSize: 16, fontWeight: 700 }}>
            Réessayer · إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}
