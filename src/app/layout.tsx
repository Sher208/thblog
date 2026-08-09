import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Source_Sans_3 } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { getServerSession } from "@/lib/session";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "thblog",
    template: "%s · thblog",
  },
  description: "A fast, mobile-first personal blog.",
  applicationName: "thblog",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "thblog",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1016" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const themeBootScript = `(function(){try{var k='thblog-theme';var t=null;var m=document.cookie.match(/(?:^|;\\s*)thblog-theme=(light|dark)/);if(m)t=m[1];if(!t){try{t=localStorage.getItem(k)}catch(e){}}if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}if(t==='dark')document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark')}catch(e){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${display.variable} ${body.variable} ${mono.variable} antialiased`}
      >
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <ThemeProvider>
          <a href="#main-content" className="skip-link">
            Skip to content
          </a>
          <SiteHeader showAdmin={Boolean(session)} />
          <main
            id="main-content"
            tabIndex={-1}
            className="mx-auto min-h-[70dvh] max-w-3xl px-5 pt-8 outline-none sm:pt-10"
          >
            {children}
          </main>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
