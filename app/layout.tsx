import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";

export const metadata: Metadata = {
  title: "Meta Ads Dashboard",
  description: "Dashboard de análise de Meta Ads para gestores de tráfego",
};

// Inline script to apply saved accent color before first paint (prevents flash)
const accentScript = `
(function(){
  try {
    var palettes = {
      teal:    '172, 66%, 50%',
      violet:  '262, 83%, 63%',
      blue:    '217, 91%, 60%',
      rose:    '348, 83%, 62%',
      amber:   '38, 92%, 52%',
      emerald: '152, 76%, 42%',
      indigo:  '234, 89%, 65%',
      coral:   '22, 93%, 55%',
    };
    var id = localStorage.getItem('accent-color');
    if (id && palettes[id]) {
      var v = 'hsl(' + palettes[id] + ')';
      var r = document.documentElement;
      r.style.setProperty('--primary', v);
      r.style.setProperty('--accent', v);
      r.style.setProperty('--ring', v);
      r.style.setProperty('--sidebar-primary', v);
      r.style.setProperty('--sidebar-ring', v);
      r.style.setProperty('--chart-1', v);
    }
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: accentScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
