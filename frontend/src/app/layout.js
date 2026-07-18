import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

export const metadata = {
  title: "CareerPath SA — Find Your Future",
  description: "AI-powered career guidance for South African learners",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
