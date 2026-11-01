import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "티라니 | 우리의 이야기를 전해요", description: "소중한 순간을 담는 모바일 청첩장" };
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="ko"><body>{children}</body></html> }
