import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

const FREE_PLAN_LIMITS = {
  measurementsPerMonth: 5,
  exportsPerMonth: 2
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const usageStats = await prisma.usageStats.findUnique({
      where: { userId: session.user.id }
    })

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id }
    })

    const isPremium = subscription?.status === 'active'

    // Check if we need to reset monthly usage
    const now = new Date()
    const lastReset = usageStats?.lastResetDate || new Date()
    const shouldReset = now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()

    if (shouldReset && usageStats) {
      await prisma.usageStats.update({
        where: { userId: session.user.id },
        data: {
          measurementsThisMonth: 0,
          exportsThisMonth: 0,
          lastResetDate: now
        }
      })
    }

    const currentUsage = shouldReset ? { measurementsThisMonth: 0, exportsThisMonth: 0 } : usageStats

    return NextResponse.json({
      usage: currentUsage || { measurementsThisMonth: 0, exportsThisMonth: 0 },
      limits: isPremium ? null : FREE_PLAN_LIMITS,
      isPremium,
      canMeasure: isPremium || (currentUsage?.measurementsThisMonth || 0) < FREE_PLAN_LIMITS.measurementsPerMonth,
      canExport: isPremium || (currentUsage?.exportsThisMonth || 0) < FREE_PLAN_LIMITS.exportsPerMonth
    })
  } catch (error) {
    console.error('Usage fetch error:', error)
    return NextResponse.json(
      { error: '利用状況の取得に失敗しました' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const { action } = await request.json()

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id }
    })

    const isPremium = subscription?.status === 'active'

    // Get or create usage stats
    let usageStats = await prisma.usageStats.findUnique({
      where: { userId: session.user.id }
    })

    if (!usageStats) {
      usageStats = await prisma.usageStats.create({
        data: {
          userId: session.user.id,
          measurementsThisMonth: 0,
          exportsThisMonth: 0
        }
      })
    }

    if (action === 'measurement') {
      // Check limits for free users
      if (!isPremium && usageStats.measurementsThisMonth >= FREE_PLAN_LIMITS.measurementsPerMonth) {
        return NextResponse.json(
          { error: '月間測定回数の上限に達しました。プレミアムプランにアップグレードしてください。' },
          { status: 403 }
        )
      }

      // Increment measurement count
      await prisma.usageStats.update({
        where: { userId: session.user.id },
        data: {
          measurementsThisMonth: usageStats.measurementsThisMonth + 1
        }
      })

      return NextResponse.json({ message: '測定回数を記録しました' })
    }

    if (action === 'export') {
      // Check limits for free users
      if (!isPremium && usageStats.exportsThisMonth >= FREE_PLAN_LIMITS.exportsPerMonth) {
        return NextResponse.json(
          { error: '月間エクスポート回数の上限に達しました。プレミアムプランにアップグレードしてください。' },
          { status: 403 }
        )
      }

      // Increment export count
      await prisma.usageStats.update({
        where: { userId: session.user.id },
        data: {
          exportsThisMonth: usageStats.exportsThisMonth + 1
        }
      })

      return NextResponse.json({ message: 'エクスポート回数を記録しました' })
    }

    return NextResponse.json(
      { error: '無効なアクションです' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Usage update error:', error)
    return NextResponse.json(
      { error: '利用状況の更新に失敗しました' },
      { status: 500 }
    )
  }
}

