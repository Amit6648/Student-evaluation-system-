import { Figtree } from "next/font/google";
import Sidebar from "./components/Sidebar";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  weight: ["400", "500", "600", "700", "800"]
});

export const metadata = {
  title: "Flipped Classroom Evaluation",
  description: "Modern evaluation system for flipped classrooms",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${figtree.variable} font-sans antialiased flex min-h-screen bg-[#E6E6DC]`}>
        {/* Persistent Global Sidebar */}
        <Sidebar className="shrink-0" />

        {/* Main Content Area */}
        <div className="flex-1 ml-64 min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
