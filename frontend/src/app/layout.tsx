import type { Metadata } from "next";
import { Fira_Sans, Fira_Code } from "next/font/google";
import "./globals.css";
import { RoleProvider } from "../context/RoleContext";
import { ThemeProvider } from "../context/ThemeContext";

const firaSans = Fira_Sans({
  variable: "--font-fira-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AutoEval & Vector Similarity System | PES University DBMS",
  description: "Automated Test Evaluation & Vector Similarity System using PostgreSQL 16, pgvector, and sentence-transformers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('app-theme');if(t==='dark'){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${firaSans.variable} ${firaCode.variable} font-sans antialiased min-h-screen bg-slate-50 dark:bg-[#0c0d12] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-slate-200 dark:selection:bg-slate-800 selection:text-slate-900 dark:selection:text-white transition-colors duration-200`}
      >
        <ThemeProvider>
          <RoleProvider>{children}</RoleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
