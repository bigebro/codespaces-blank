import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 📱 УТАСНЫ ДЭЛГЭЦИЙГ 100% БОДИТ ТОМ ХЭМЖЭЭГЭЭР НЬ ХАРУУЛАХ ҮНДСЭН ТОХИРГОО:
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Smart BoH",
  description: "Smart BoH - Cloud Kitchen & Back of House Operations",
  manifest: "/manifest.json",
  icons: {
    icon: "/apple-touch-icon.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Smart BoH",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
         {/* 🚨 IPAD ДЭЭР ЯМАР АЛДАА ГАРЧ JAVASCRIPT-ИЙГ АЛЖ БАЙГААГ ДЭЛГЭЦЭНД ШУУД ХАРУУЛАХ КОД: */}
           
        {/* 🍏 APPLE (IPAD / IPHONE) ТОХИРГОО: */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Smart BoH" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        {/* 🤖 ANDROID (GOOGLE CHROME) ТОХИРГОО: */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#070b14" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.onerror = function(message, source, lineno, colno, error) {
                alert("🚨 IPAD ДЭЭРХ БОДИТ АЛДАА: " + message + "\\nФайл: " + source + "\\nМөр: " + lineno);
              };
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#070b14] text-slate-100">{children}</body>
    </html>
  );
}