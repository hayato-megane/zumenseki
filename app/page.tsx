import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <main className="text-center p-8">
        <h1 className="text-5xl font-bold mb-4">PDFメガネ 👓</h1>
        <p className="text-xl text-gray-600 mb-8">PDFをアップロードするだけで、AIがあなたの質問に何でも答えます。</p>
        <div className="space-x-4">
          <Link href="/auth/signin">
            <Button variant="outline">
              ログイン
            </Button>
          </Link>
          <Link href="/chat">
            <Button className="bg-blue-600 text-white hover:bg-blue-700">
              無料で始める
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
