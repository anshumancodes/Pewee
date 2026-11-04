import type { Metadata } from "next";
import "./globals.css";
import { Manrope, Faustina } from "next/font/google";
import { Nav } from "@/components/global/Nav";
import Footer from "@/components/global/Footer";
import { WebsiteJsonLd } from "@/components/JsonLd";
import PromotionalBanner from "@/components/banners/PromotionalBanner";
import Script from "next/script";
import { siteConfig } from "@/site.config";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-manrope",
});

const faustina = Faustina({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-faustina",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": [{ url: "/rss.xml", title: siteConfig.name }],
    },
  },

  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: siteConfig.author.name, url: siteConfig.author.url }],
  creator: siteConfig.author.name,
  robots: siteConfig.robots,
  openGraph: {
    title: siteConfig.ogTitle,
    description: siteConfig.ogDescription,
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        alt: siteConfig.name,
      },
    ],
    locale: siteConfig.locale,
    type: "website",
  },
  twitter: {
    card: siteConfig.twitterCard,
    ...(siteConfig.twitterHandle && {
      site: siteConfig.twitterHandle,
      creator: siteConfig.twitterHandle,
    }),
    title: siteConfig.ogTitle,
    description: siteConfig.ogDescription,
    images: [siteConfig.ogImage],
  },
  icons: {
    icon: siteConfig.icon,
    apple: siteConfig.icon,
    shortcut: siteConfig.icon,
  },
  other: {
    "theme-color": siteConfig.themeColor,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang={siteConfig.language} className="dark">
      <body
        className={`${manrope.variable} ${faustina.variable} min-h-screen bg-background text-foreground antialiased selection:bg-white selection:text-black`}
      >
        {siteConfig.googleAnalyticsId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${siteConfig.googleAnalyticsId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${siteConfig.googleAnalyticsId}');`}
            </Script>
          </>
        )}
        {siteConfig.announcement && (
          <PromotionalBanner announcement={siteConfig.announcement} />
        )}
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-5 pt-4 pb-12 sm:px-8">
          <Nav />
          <main className="flex-1 py-8 sm:py-12">{children}</main>
          <Footer />
        </div>

        {/* Structured WebSite JSON-LD */}
        <WebsiteJsonLd />
      </body>
    </html>
  );
}
