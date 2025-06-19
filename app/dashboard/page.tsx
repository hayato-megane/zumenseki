"use client"

import { useEffect, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  User, 
  CreditCard, 
  BarChart3, 
  FileText, 
  Download,
  Crown,
  Settings
} from "lucide-react"

interface SubscriptionData {
  subscription: any
  usageStats: {
    measurementsThisMonth: number
    exportsThisMonth: number
  }
  isPremium: boolean
}

interface UsageData {
  usage: {
    measurementsThisMonth: number
    exportsThisMonth: number
  }
  limits: {
    measurementsPerMonth: number
    exportsPerMonth: number
  } | null
  isPremium: boolean
  canMeasure: boolean
  canExport: boolean
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null)
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated") {
      fetchData()
    }
  }, [status, router])

  const fetchData = async () => {
    try {
      const [subscriptionResponse, usageResponse] = await Promise.all([
        fetch("/api/subscription"),
        fetch("/api/usage")
      ])

      if (subscriptionResponse.ok) {
        const subscriptionData = await subscriptionResponse.json()
        setSubscriptionData(subscriptionData)
      }

      if (usageResponse.ok) {
        const usageData = await usageResponse.json()
        setUsageData(usageData)
      }
    } catch (error) {
      setError("データの取得に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm("サブスクリプションをキャンセルしますか？")) return

    try {
      const response = await fetch("/api/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "cancel" }),
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      setError("キャンセル処理に失敗しました")
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const isPremium = subscriptionData?.isPremium || false
  const measurementUsage = usageData?.usage.measurementsThisMonth || 0
  const exportUsage = usageData?.usage.exportsThisMonth || 0
  const measurementLimit = usageData?.limits?.measurementsPerMonth || 0
  const exportLimit = usageData?.limits?.exportsPerMonth || 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">PDFメガネ ダッシュボード</h1>
              {isPremium && (
                <Badge className="ml-3 bg-yellow-500 text-white">
                  <Crown className="h-3 w-3 mr-1" />
                  プレミアム
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {session.user?.name || session.user?.email}
              </span>
              <Button variant="outline" onClick={() => signOut()}>
                ログアウト
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">PDF測定</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">測定開始</div>
                <p className="text-xs text-muted-foreground">
                  PDFをアップロードして面積・長さを測定
                </p>
                <Link href="/chat">
                  <Button className="w-full mt-4">測定ページへ</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">プラン管理</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isPremium ? "プレミアム" : "無料プラン"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isPremium ? "すべての機能が利用可能" : "制限付きでご利用中"}
                </p>
                <Link href="/pricing">
                  <Button variant="outline" className="w-full mt-4">
                    {isPremium ? "プラン変更" : "アップグレード"}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">利用状況</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">今月の利用</div>
                <p className="text-xs text-muted-foreground">
                  測定: {measurementUsage}回 / エクスポート: {exportUsage}回
                </p>
                <Button variant="outline" className="w-full mt-4" disabled>
                  詳細を見る
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Usage Statistics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>今月の測定回数</CardTitle>
                <CardDescription>
                  {isPremium ? "無制限でご利用いただけます" : `月間${measurementLimit}回まで利用可能`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>使用済み</span>
                    <span>{measurementUsage}{isPremium ? "" : ` / ${measurementLimit}`}回</span>
                  </div>
                  {!isPremium && (
                    <Progress 
                      value={(measurementUsage / measurementLimit) * 100} 
                      className="w-full"
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>今月のエクスポート回数</CardTitle>
                <CardDescription>
                  {isPremium ? "無制限でご利用いただけます" : `月間${exportLimit}回まで利用可能`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>使用済み</span>
                    <span>{exportUsage}{isPremium ? "" : ` / ${exportLimit}`}回</span>
                  </div>
                  {!isPremium && (
                    <Progress 
                      value={(exportUsage / exportLimit) * 100} 
                      className="w-full"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subscription Management */}
          {isPremium && subscriptionData?.subscription && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>サブスクリプション管理</CardTitle>
                <CardDescription>
                  現在のサブスクリプション情報
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">ステータス</p>
                      <p className="text-sm text-gray-600">
                        {subscriptionData.subscription.status === 'active' ? 'アクティブ' : subscriptionData.subscription.status}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">次回更新日</p>
                      <p className="text-sm text-gray-600">
                        {subscriptionData.subscription.currentPeriodEnd 
                          ? new Date(subscriptionData.subscription.currentPeriodEnd).toLocaleDateString('ja-JP')
                          : '不明'
                        }
                      </p>
                    </div>
                  </div>
                  
                  {!subscriptionData.subscription.cancelAtPeriodEnd && (
                    <Button 
                      variant="destructive" 
                      onClick={handleCancelSubscription}
                    >
                      サブスクリプションをキャンセル
                    </Button>
                  )}
                  
                  {subscriptionData.subscription.cancelAtPeriodEnd && (
                    <Alert>
                      <AlertDescription>
                        サブスクリプションは次回更新日にキャンセルされます。
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

