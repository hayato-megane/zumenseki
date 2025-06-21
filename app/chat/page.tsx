"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Upload, ChevronLeft, ChevronRight, FolderOpen, Trash2, FileText, Calendar, HardDrive, Crown, User, LogOut } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
<<<<<<< HEAD
import { Document, Page, pdfjs } from 'react-pdf'
=======

import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
>>>>>>> ed8e8455efb5b503630cda4400ff8196949698b2

// PDF.js worker設定
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

<<<<<<< HEAD
=======

>>>>>>> ed8e8455efb5b503630cda4400ff8196949698b2
interface Point {
  x: number
  y: number
}

interface AreaResult {
  id: string
  area: number
  unit: string
  points: Point[]
  name: string
  color: string
  timestamp: Date
  pageNumber: number
  measurementType: "polygon" | "length"
  length?: number
  height?: number
  textPosition?: Point
}

interface PDFPage {
  canvas: HTMLCanvasElement
  pageNumber: number
}

interface PageSummary {
  pageNumber: number
  measurementCount: number
  totalArea: number
  unit: string
}

interface PageScale {
  pageNumber: number
  scaleFactor: number
  unit: string
  referencePoints: Point[]
  realDistance: number
  timestamp: Date
}

interface PDFHistory {
  id: string
  name: string
  size: number
  uploadDate: Date
  lastAccessed: Date
  measurementCount: number
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

const MEASUREMENT_COLORS = [
  "#22c55e", // green
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
]

export default function PDFAreaCalculator() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfPages, setPdfPages] = useState<PDFPage[]>([])
  const [currentPage, setCurrentPage] = useState(0)
<<<<<<< HEAD
  const [numPages, setNumPages] = useState<number>(0)
=======
>>>>>>> ed8e8455efb5b503630cda4400ff8196949698b2
  const [points, setPoints] = useState<Point[]>([])
  const [scaleFactor, setScaleFactor] = useState(1)
  const [unit, setUnit] = useState("m")
  const [allMeasurements, setAllMeasurements] = useState<AreaResult[]>([])
  const [currentMeasurementName, setCurrentMeasurementName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [usageData, setUsageData] = useState<UsageData | null>(null)
<<<<<<< HEAD
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // PDF読み込み成功時の処理
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setCurrentPage(1)
    setError("")
    setIsLoading(false)
  }

  // PDF読み込みエラー時の処理
  const onDocumentLoadError = (error: Error) => {
    console.error('PDF読み込みエラー:', error)
    setError('PDFファイルの読み込みに失敗しました。')
    setIsLoading(false)
  }

  // ファイル選択時の処理
  const handleFileSelect = (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('PDFファイルを選択してください。')
      return
    }
    
    setIsLoading(true)
    setPdfFile(file)
    setError("")
    setPoints([])
    setAllMeasurements([])
  }
=======
>>>>>>> ed8e8455efb5b503630cda4400ff8196949698b2

  // 利用状況を取得
  const fetchUsageData = useCallback(async () => {
    if (status !== "authenticated") return

    try {
      const response = await fetch("/api/usage")
      if (response.ok) {
        const data = await response.json()
        setUsageData(data)
      }
    } catch (error) {
      console.error("利用状況の取得に失敗しました:", error)
    }
  }, [status])

  // 初期化時に利用状況を取得
  useEffect(() => {
    if (status === "authenticated") {
      fetchUsageData()
    }
  }, [status, fetchUsageData])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-xl font-bold text-gray-900">
                PDFメガネ 👓
              </Link>
              {status === "authenticated" && usageData?.isPremium && (
                <Badge className="bg-yellow-500 text-white">
                  <Crown className="h-3 w-3 mr-1" />
                  プレミアム
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {status === "authenticated" && usageData && (
                <div className="text-sm text-gray-600">
                  測定: {usageData.usage.measurementsThisMonth}
                  {!usageData.isPremium && `/${usageData.limits?.measurementsPerMonth}`}回 |
                  エクスポート: {usageData.usage.exportsThisMonth}
                  {!usageData.isPremium && `/${usageData.limits?.exportsPerMonth}`}回
                </div>
              )}
              
              {status === "authenticated" ? (
                <div className="flex items-center space-x-2">
                  <Link href="/dashboard">
                    <Button variant="outline" size="sm">
                      <User className="h-4 w-4 mr-1" />
                      ダッシュボード
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link href="/auth/signin">
                    <Button variant="outline" size="sm">
                      ログイン
                    </Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button size="sm">
                      新規登録
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 利用制限の警告 */}
      {status === "authenticated" && usageData && !usageData.isPremium && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-yellow-800">
                無料プランをご利用中です。
                測定: {usageData.usage.measurementsThisMonth}/{usageData.limits?.measurementsPerMonth}回、
                エクスポート: {usageData.usage.exportsThisMonth}/{usageData.limits?.exportsPerMonth}回
              </div>
              <Link href="/pricing">
                <Button size="sm" variant="outline" className="border-yellow-300 text-yellow-800 hover:bg-yellow-100">
                  プレミアムにアップグレード
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                PDF面積測定アプリ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={() => document.getElementById('pdf-upload')?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    PDFファイルを選択
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    PDF管理
                  </Button>
                </div>
                
                <input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
<<<<<<< HEAD
                      handleFileSelect(file)
=======
                      setPdfFile(file)
                      // ここでPDF処理ロジックを実装
>>>>>>> ed8e8455efb5b503630cda4400ff8196949698b2
                    }
                  }}
                />

                {error && (
                  <Alert>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {!pdfFile && (
                  <div className="text-center py-12 text-gray-500">
                    PDFファイルを選択してください
                  </div>
                )}
<<<<<<< HEAD

                {pdfFile && (
                  <div className="space-y-4">
                    {isLoading && (
                      <div className="text-center py-4">
                        <div className="text-sm text-gray-600">PDFを読み込み中...</div>
                      </div>
                    )}
                    
                    <Document
                      file={pdfFile}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={onDocumentLoadError}
                      loading={<div className="text-center py-4">PDFを読み込み中...</div>}
                    >
                      {numPages > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage <= 1}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <span className="text-sm">
                                {currentPage} / {numPages}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
                                disabled={currentPage >= numPages}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="border rounded-lg overflow-hidden">
                            <Page
                              pageNumber={currentPage}
                              width={800}
                              renderTextLayer={false}
                              renderAnnotationLayer={false}
                            />
                          </div>
                        </div>
                      )}
                    </Document>
                  </div>
                )}
=======
>>>>>>> ed8e8455efb5b503630cda4400ff8196949698b2
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

