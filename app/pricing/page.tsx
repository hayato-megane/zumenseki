"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, X } from "lucide-react"

const plans = [
  {
    id: "free",
    name: "無料プラン",
    price: "¥0",
    period: "/月",
    description: "基本的な測定機能をお試しいただけます",
    features: [
      "PDFアップロード・閲覧",
      "面積・長さ測定（月5回まで）",
      "測定結果保存（最新1件）",
      "エクスポート（月2回まで）"
    ],
    limitations: [
      "測定回数制限あり",
      "保存件数制限あり",
      "エクスポート制限あり"
    ],
    current: true
  },
  {
    id: "premium",
    name: "プレミアムプラン",
    price: "¥980",
    period: "/月",
    description: "すべての機能を無制限でご利用いただけます",
    features: [
      "PDFアップロード・閲覧（無制限）",
      "面積・長さ測定（無制限）",
      "測定結果保存（無制限）",
      "エクスポート（無制限）",
      "優先サポート"
    ],
    limitations: [],
    popular: true,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID
  }
]

export default function PricingPage() {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const router = useRouter()

  const handleSubscribe = async (priceId: string) => {
    setIsLoading(priceId)

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ priceId }),
      })

      const data = await response.json()

      if (response.ok && data.url) {
        window.location.href = data.url
      } else {
        console.error("Checkout session creation failed:", data.error)
      }
    } catch (error) {
      console.error("Error creating checkout session:", error)
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            プラン選択
          </h1>
          <p className="text-xl text-gray-600">
            あなたに最適なプランをお選びください
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {plans.map((plan) => (
            <Card key={plan.id} className={`relative ${plan.popular ? 'border-blue-500 border-2' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-500 text-white">人気プラン</Badge>
                </div>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-gray-600">{plan.period}</span>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-green-600 mb-2">含まれる機能</h4>
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <Check className="h-4 w-4 text-green-500 mr-2" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {plan.limitations.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-red-600 mb-2">制限事項</h4>
                      <ul className="space-y-2">
                        {plan.limitations.map((limitation, index) => (
                          <li key={index} className="flex items-center">
                            <X className="h-4 w-4 text-red-500 mr-2" />
                            <span className="text-sm">{limitation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                <div className="mt-6">
                  {plan.current ? (
                    <Button variant="outline" className="w-full" disabled>
                      現在のプラン
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleSubscribe(plan.priceId!)}
                      disabled={isLoading === plan.priceId}
                    >
                      {isLoading === plan.priceId ? "処理中..." : "このプランを選択"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
          >
            ダッシュボードに戻る
          </Button>
        </div>
      </div>
    </div>
  )
}

