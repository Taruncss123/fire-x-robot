import "./globals.css";

export const metadata = {
  title: "FIRE-X Command Center | Strategic Risk & Fire Mitigation",
  description: "Tactical teleoperation & telemetry monitoring dashboard for FIRE-X tracked fire-fighting rover",
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.jpg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen bg-[#0D0E11] text-[#F5EFEB] antialiased">
        {children}
      </body>
    </html>
  );
}
