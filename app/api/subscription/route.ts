import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id }
    })

    const usageStats = await prisma.usageStats.findUnique({
      where: { userId: session.user.id }
    })

    return NextResponse.json({
      subscription: subscription || null,
      usageStats: usageStats || { measurementsThisMonth: 0, exportsThisMonth: 0 },
      isPremium: subscription?.status === 'active'
    })
  } catch (error) {
    console.error('Subscription fetch error:', error)
    return NextResponse.json(
      { error: 'サブスクリプション情報の取得に失敗しました' },
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

    if (action === 'cancel') {
      // Cancel subscription
      await prisma.subscription.update({
        where: { userId: session.user.id },
        data: {
          cancelAtPeriodEnd: true,
          updatedAt: new Date()
        }
      })

      return NextResponse.json({ message: 'サブスクリプションをキャンセルしました' })
    }

    return NextResponse.json(
      { error: '無効なアクションです' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Subscription update error:', error)
    return NextResponse.json(
      { error: 'サブスクリプションの更新に失敗しました' },
      { status: 500 }
    )
  }
}

