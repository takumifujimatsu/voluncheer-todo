import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { FirebaseConfigGuard } from "@/components/FirebaseConfigGuard";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ボランチア ToDo",
  description: "NPO法人内タスク管理アプリ",
  icons: {
    icon: "/tabIcon.png",
    apple: "/tabIcon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  var k = 'voluncheer-theme';
  var v = localStorage.getItem(k);
  var dark = v === 'dark' || (v !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (dark) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
})();
            `.trim(),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <ClientErrorBoundary>
            <FirebaseConfigGuard>
              <AuthProvider>{children}</AuthProvider>
            </FirebaseConfigGuard>
          </ClientErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
