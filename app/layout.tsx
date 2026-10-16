import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {title:"Norgez Industrial | B2B Supply Platform",description:"A smarter way to source industrial essentials in bulk."};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }