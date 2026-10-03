import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {title:"Wordnest · Góc từ vựng",description:"Dán bảng từ ChatGPT, học với thẻ ghi nhớ và trò chơi tiếng Anh.",icons:{icon:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="vi"><body>{children}</body></html>;}
