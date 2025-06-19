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

const COLOR_PALETTE = [
  "#22c55e", // green
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
  "#ec4899", // pink
  "#10b981", // emerald
  "#6366f1", // indigo
  "#f43f5e", // rose
  "#14b8a6", // teal
  "#8b5a2b", // brown
  "#6b7280", // gray
  "#000000", // black
]

export default function PDFAreaCalculator() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfPages, setPdfPages] = useState<PDFPage[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [points, setPoints] = useState<Point[]>([])
  const [scaleFactor, setScaleFactor] = useState(1)
  const [unit, setUnit] = useState("m")
  const [allMeasurements, setAllMeasurements] = useState<AreaResult[]>([])
  const [currentMeasurementName, setCurrentMeasurementName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [scaleMode, setScaleMode] = useState(false)
  const [scalePoints, setScalePoints] = useState<Point[]>([])
  const [realDistance, setRealDistance] = useState("")
  const [error, setError] = useState("")
  const [xlsxLoaded, setXlsxLoaded] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const [pageScales, setPageScales] = useState<PageScale[]>([])
  const [jsPDFLoaded, setJsPDFLoaded] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [usageData, setUsageData] = useState<UsageData | null>(null)

  // 長さ測定関連の状態
  const [lengthMode, setLengthMode] = useState(false)
  const [lengthPoints, setLengthPoints] = useState<Point[]>([])
  const [heightInput, setHeightInput] = useState("")

  // 測定名編集関連の状態
  const [editingMeasurementId, setEditingMeasurementId] = useState<string | null>(null)
  const [editingMeasurementName, setEditingMeasurementName] = useState("")

  // 色選択関連の状態
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null)
  const [customColor, setCustomColor] = useState("#22c55e")

  // ページ名設定関連の状態
  const [pageNames, setPageNames] = useState<{ [pageNumber: number]: string }>({})
  const [editingPageName, setEditingPageName] = useState<number | null>(null)
  const [editingPageNameValue, setEditingPageNameValue] = useState("")

  // 文字ドラッグ関連の状態
  const [draggingTextId, setDraggingTextId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 })

  // PDF管理関連の状態
  const [pdfHistory, setPdfHistory] = useState<PDFHistory[]>([])
  const [showPdfManager, setShowPdfManager] = useState(false)
  const [deletingPdfId, setDeletingPdfId] = useState<string | null>(null)

  // 現在のページの測定結果を取得
  const currentPageMeasurements = allMeasurements.filter((m) => m.pageNumber === currentPage + 1)

  // ページ別サマリーを生成
  const pageSummaries: PageSummary[] = pdfPages.map((_, index) => {
    const pageNumber = index + 1
    const pageMeasurements = allMeasurements.filter((m) => m.pageNumber === pageNumber)
    return {
      pageNumber,
      measurementCount: pageMeasurements.length,
      totalArea: pageMeasurements.reduce((sum, m) => sum + m.area, 0),
      unit: unit,
    }
  })

  // 全ページの合計
  const grandTotal = {
    measurementCount: allMeasurements.length,
    totalArea: allMeasurements.reduce((sum, m) => sum + m.area, 0),
    unit: unit,
  }

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

  // 測定回数を記録
  const recordMeasurement = useCallback(async () => {
    if (status !== "authenticated") return

    try {
      const response = await fetch("/api/usage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "measurement" }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || "測定回数の記録に失敗しました")
        return false
      }

      await fetchUsageData()
      return true
    } catch (error) {
      setError("測定回数の記録に失敗しました")
      return false
    }
  }, [status, fetchUsageData])

  // エクスポート回数を記録
  const recordExport = useCallback(async () => {
    if (status !== "authenticated") return true // ゲストユーザーは制限なし

    try {
      const response = await fetch("/api/usage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "export" }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || "エクスポート回数の記録に失敗しました")
        return false
      }

      await fetchUsageData()
      return true
    } catch (error) {
      setError("エクスポート回数の記録に失敗しました")
      return false
    }
  }, [status, fetchUsageData])

  // 初期化時に利用状況を取得
  useEffect(() => {
    if (status === "authenticated") {
      fetchUsageData()
    }
  }, [status, fetchUsageData])

  // ローカルストレージからPDF履歴を読み込み
  const loadPdfHistory = useCallback(() => {
    try {
      const saved = localStorage.getItem("pdf-history")
      if (saved) {
        const parsed = JSON.parse(saved)
        const history = parsed.map((item: any) => ({
          ...item,
          uploadDate: new Date(item.uploadDate),
          lastAccessed: new Date(item.lastAccessed),
        }))
        setPdfHistory(history)
      }
    } catch (error) {
      console.error("PDF履歴の読み込みに失敗しました:", error)
    }
  }, [])

  // ローカルストレージにPDF履歴を保存
  const savePdfHistory = useCallback((history: PDFHistory[]) => {
    try {
      localStorage.setItem("pdf-history", JSON.stringify(history))
    } catch (error) {
      console.error("PDF履歴の保存に失敗しました:", error)
    }
  }, [])

  // PDFファイルを履歴に追加
  const addToHistory = useCallback(
    async (file: File) => {
      try {
        const newEntry: PDFHistory = {
          id: Date.now().toString(),
          name: file.name,
          size: file.size,
          uploadDate: new Date(),
          lastAccessed: new Date(),
          measurementCount: 0,
        }

        const updatedHistory = [newEntry, ...pdfHistory.filter((item) => item.name !== file.name)].slice(0, 20) // 最大20件まで保持
        setPdfHistory(updatedHistory)
        savePdfHistory(updatedHistory)
      } catch (error) {
        console.error("PDF履歴への追加に失敗しました:", error)
      }
    },
    [pdfHistory, savePdfHistory],
  )

  // PDF履歴を更新（測定数など）
  const updatePdfHistory = useCallback(
    (fileName: string, measurementCount: number) => {
      const updatedHistory = pdfHistory.map((item) =>
        item.name === fileName
          ? {
              ...item,
              measurementCount,
              lastAccessed: new Date(),
            }
          : item,
      )
      setPdfHistory(updatedHistory)
      savePdfHistory(updatedHistory)
    },
    [pdfHistory, savePdfHistory],
  )

  // PDF履歴から削除
  const deletePdfFromHistory = useCallback(
    (id: string) => {
      const updatedHistory = pdfHistory.filter((item) => item.id !== id)
      setPdfHistory(updatedHistory)
      savePdfHistory(updatedHistory)
      setDeletingPdfId(null)
    },
    [pdfHistory, savePdfHistory],
  )

  // 履歴からPDFを選択する関数に変更
  const selectPdfFromHistory = useCallback((historyItem: PDFHistory) => {
    // ファイル選択ダイアログを開く
    const fileInput = document.getElementById("pdf-upload") as HTMLInputElement
    if (fileInput) {
      fileInput.click()
    }
    setShowPdfManager(false)

    // 選択されたファイル情報を一時的に保存
    sessionStorage.setItem("selectedHistoryItem", JSON.stringify(historyItem))
  }, [])

  // ファイルサイズをフォーマット
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // XLSXライブラリを読み込み
  const loadXLSX = useCallback(() => {
    if (typeof window !== "undefined" && !(window as any).XLSX) {
      const script = document.createElement("script")
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
      script.onload = () => {
        setXlsxLoaded(true)
      }
      script.onerror = () => {
        console.warn("XLSXライブラリの読み込みに失敗しました")
        setXlsxLoaded(false)
      }
      document.head.appendChild(script)
    } else if ((window as any).XLSX) {
      setXlsxLoaded(true)
    }
  }, [])

  // jsPDFライブラリを読み込み
  const loadJsPDF = useCallback(() => {
    if (typeof window !== "undefined" && !(window as any).jspdf) {
      const script = document.createElement("script")
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
      script.onload = () => {
        setJsPDFLoaded(true)
      }
      script.onerror = () => {
        console.warn("jsPDFライブラリの読み込みに失敗しました")
        setJsPDFLoaded(false)
      }
      document.head.appendChild(script)
    } else if ((window as any).jspdf) {
      setJsPDFLoaded(true)
    }
  }, [])

  // 測定を確定
  const confirmMeasurement = async () => {
    if (points.length < 3) {
      setError("面積測定には最低3点が必要です")
      return
    }

    // 認証済みユーザーの場合は利用制限をチェック
    if (status === "authenticated") {
      if (!usageData?.canMeasure) {
        setError("月間測定回数の上限に達しました。プレミアムプランにアップグレードしてください。")
        return
      }

      // 測定回数を記録
      const success = await recordMeasurement()
      if (!success) return
    }

    const area = calculatePolygonArea(points)
    const scaledArea = area * scaleFactor ** 2

    // 現在のページの測定数を取得してカラーインデックスを決定
    const pageColorIndex = currentPageMeasurements.length % MEASUREMENT_COLORS.length
    const pageName = pageNames[currentPage + 1] || `P${currentPage + 1}`

    const measurement: AreaResult = {
      id: Date.now().toString(),
      area: Math.round(scaledArea * 100) / 100,
      unit: unit,
      points: [...points],
      name:
        currentMeasurementName ||
        `${pageName}-測定${currentPageMeasurements.filter((m) => m.measurementType === "polygon").length + 1}`,
      color: MEASUREMENT_COLORS[pageColorIndex],
      timestamp: new Date(),
      pageNumber: currentPage + 1,
      measurementType: "polygon",
    }

    setAllMeasurements((prev) => [...prev, measurement])
    setPoints([])
    setCurrentMeasurementName("")
    setError("")

    // PDF履歴の測定数を更新
    if (pdfFile) {
      updatePdfHistory(pdfFile.name, allMeasurements.length + 1)
    }
  }

  // 長さ測定を確定
  const confirmLengthMeasurement = async () => {
    if (lengthPoints.length < 2) {
      setError("長さ測定には最低2点が必要です")
      return
    }

    if (!heightInput || Number.parseFloat(heightInput) <= 0) {
      setError("有効な高さを入力してください")
      return
    }

    // 認証済みユーザーの場合は利用制限をチェック
    if (status === "authenticated") {
      if (!usageData?.canMeasure) {
        setError("月間測定回数の上限に達しました。プレミアムプランにアップグレードしてください。")
        return
      }

      // 測定回数を記録
      const success = await recordMeasurement()
      if (!success) return
    }

    const totalPixelLength = calculateTotalLength(lengthPoints)
    const scaledLength = totalPixelLength * scaleFactor
    const height = Number.parseFloat(heightInput)
    const calculatedArea = scaledLength * height

    // 現在のページの測定数を取得してカラーインデックスを決定
    const pageColorIndex = currentPageMeasurements.length % MEASUREMENT_COLORS.length
    const pageName = pageNames[currentPage + 1] || `P${currentPage + 1}`

    const measurement: AreaResult = {
      id: Date.now().toString(),
      area: Math.round(calculatedArea * 100) / 100,
      unit: unit,
      points: [...lengthPoints],
      name:
        currentMeasurementName ||
        `${pageName}-長さ測定${currentPageMeasurements.filter((m) => m.measurementType === "length").length + 1}`,
      color: MEASUREMENT_COLORS[pageColorIndex],
      timestamp: new Date(),
      pageNumber: currentPage + 1,
      measurementType: "length",
      length: Math.round(scaledLength * 100) / 100,
      height: height,
    }

    setAllMeasurements((prev) => [...prev, measurement])
    setLengthPoints([])
    setHeightInput("")
    setCurrentMeasurementName("")
    setError("")

    // PDF履歴の測定数を更新
    if (pdfFile) {
      updatePdfHistory(pdfFile.name, allMeasurements.length + 1)
    }
  }

  // 測定を削除
  const deleteMeasurement = (id: string) => {
    setAllMeasurements((prev) => prev.filter((m) => m.id !== id))

    // PDF履歴の測定数を更新
    if (pdfFile) {
      updatePdfHistory(pdfFile.name, allMeasurements.length - 1)
    }
  }

  // エクスポート機能を制限付きに変更
  const downloadExcel = async () => {
    if (allMeasurements.length === 0) {
      setError("エクスポートする測定結果がありません")
      return
    }

    // 認証済みユーザーの場合は利用制限をチェック
    if (status === "authenticated") {
      if (!usageData?.canExport) {
        setError("月間エクスポート回数の上限に達しました。プレミアムプランにアップグレードしてください。")
        return
      }

      // エクスポート回数を記録
      const success = await recordExport()
      if (!success) return
    }

    setError("")

    try {
      if (xlsxLoaded && (window as any).XLSX) {
        // XLSXライブラリを使用してエクスポート
        const XLSX = (window as any).XLSX

        const worksheetData = [
          ["測定名", "ページ", "面積", "単位", "測定点数", "測定日時"],
          ...allMeasurements.map((measurement) => [
            measurement.name,
            measurement.pageNumber,
            measurement.area,
            `${measurement.unit}²`,
            measurement.points.length,
            measurement.timestamp.toLocaleString("ja-JP"),
          ]),
          ["合計", "", Math.round(grandTotal.totalArea * 100) / 100, `${unit}²`, grandTotal.measurementCount, ""],
        ]

        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "測定結果")

        XLSX.writeFile(workbook, `PDF測定結果_${new Date().toISOString().split("T")[0]}.xlsx`)
      } else {
        // フォールバック: 手動でXMLベースのエクセルファイルを生成
        const excelXML = generateExcelManually()
        const blob = new Blob([excelXML], { type: "application/vnd.ms-excel" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `PDF測定結果_${new Date().toISOString().split("T")[0]}.xls`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("エクスポートエラー:", error)
      setError("エクスポート中にエラーが発生しました")
    }
  }

  // 図面PDFをダウンロード（制限付き）
  const downloadPDF = async () => {
    if (pdfPages.length === 0) {
      setError("ダウンロードする図面がありません")
      return
    }

    // 認証済みユーザーの場合は利用制限をチェック
    if (status === "authenticated") {
      if (!usageData?.canExport) {
        setError("月間エクスポート回数の上限に達しました。プレミアムプランにアップグレードしてください。")
        return
      }

      // エクスポート回数を記録
      const success = await recordExport()
      if (!success) return
    }

    setIsExporting(true)
    setError("")

    try {
      if (!jsPDFLoaded || !(window as any).jspdf) {
        setError("PDFライブラリが読み込まれていません。しばらく待ってから再試行してください。")
        setIsExporting(false)
        return
      }

      const { jsPDF } = (window as any).jspdf

      // A4サイズでPDFを作成
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 10

      for (let pageIndex = 0; pageIndex < pdfPages.length; pageIndex++) {
        if (pageIndex > 0) {
          pdf.addPage()
        }

        // 一時的にキャンバスを作成して図面を合成
        const tempCanvas = document.createElement("canvas")
        const tempCtx = tempCanvas.getContext("2d")

        if (!tempCtx) continue

        const originalCanvas = pdfPages[pageIndex].canvas
        tempCanvas.width = originalCanvas.width
        tempCanvas.height = originalCanvas.height

        // 背景（PDF図面）を描画
        tempCtx.drawImage(originalCanvas, 0, 0)

        // 該当ページの測定結果を描画
        const pageMeasurements = allMeasurements.filter((m) => m.pageNumber === pageIndex + 1)

        pageMeasurements.forEach((measurement) => {
          if (measurement.measurementType === "length" && measurement.points.length >= 2) {
            // 長さ測定の線を描画
            tempCtx.strokeStyle = measurement.color
            tempCtx.lineWidth = 3
            tempCtx.beginPath()
            tempCtx.moveTo(measurement.points[0].x, measurement.points[0].y)
            for (let i = 1; i < measurement.points.length; i++) {
              tempCtx.lineTo(measurement.points[i].x, measurement.points[i].y)
            }
            tempCtx.stroke()

            // 測定名と面積を表示（中点に）
            const midIndex = Math.floor(measurement.points.length / 2)
            const midX = measurement.points[midIndex].x
            const midY = measurement.points[midIndex].y

            tempCtx.fillStyle = "#ffffff"
            tempCtx.strokeStyle = "#000000"
            tempCtx.lineWidth = 2
            tempCtx.font = "bold 16px Arial"
            tempCtx.textAlign = "center"

            // 測定名を表示
            tempCtx.strokeText(measurement.name, midX, midY - 25)
            tempCtx.fillText(measurement.name, midX, midY - 25)

            // 長さと面積を表示
            tempCtx.font = "bold 14px Arial"
            const lengthText = `長さ: ${measurement.length} ${measurement.unit}`
            tempCtx.strokeText(lengthText, midX, midY - 5)
            tempCtx.fillText(lengthText, midX, midY - 5)

            const areaText = `面積: ${measurement.area} ${measurement.unit}²`
            tempCtx.strokeText(areaText, midX, midY + 15)
            tempCtx.fillText(areaText, midX, midY + 15)
          } else if (measurement.points.length > 2) {
            // 多角形を描画
            tempCtx.strokeStyle = measurement.color
            tempCtx.fillStyle = measurement.color + "40"
            tempCtx.lineWidth = 3

            tempCtx.beginPath()
            tempCtx.moveTo(measurement.points[0].x, measurement.points[0].y)
            for (let i = 1; i < measurement.points.length; i++) {
              tempCtx.lineTo(measurement.points[i].x, measurement.points[i].y)
            }
            tempCtx.closePath()
            tempCtx.fill()
            tempCtx.stroke()

            // 測定名と面積を表示
            const centerX = measurement.points.reduce((sum, p) => sum + p.x, 0) / measurement.points.length
            const centerY = measurement.points.reduce((sum, p) => sum + p.y, 0) / measurement.points.length

            tempCtx.fillStyle = "#ffffff"
            tempCtx.strokeStyle = "#000000"
            tempCtx.lineWidth = 2
            tempCtx.font = "bold 16px Arial"
            tempCtx.textAlign = "center"

            // 測定名を表示
            tempCtx.strokeText(measurement.name, centerX, centerY - 10)
            tempCtx.fillText(measurement.name, centerX, centerY - 10)

            // 面積を表示
            tempCtx.font = "bold 14px Arial"
            const areaText = `${measurement.area} ${measurement.unit}²`
            tempCtx.strokeText(areaText, centerX, centerY + 15)
            tempCtx.fillText(areaText, centerX, centerY + 15)
          }
        })

        // キャンバスを画像として取得
        const imgData = tempCanvas.toDataURL("image/jpeg", 0.95)

        // 画像のアスペクト比を計算
        const imgAspectRatio = tempCanvas.width / tempCanvas.height
        const availableWidth = pageWidth - margin * 2
        const availableHeight = pageHeight - margin * 3 - 40 // 下部の情報表示用スペース

        let imgWidth = availableWidth
        let imgHeight = availableWidth / imgAspectRatio

        if (imgHeight > availableHeight) {
          imgHeight = availableHeight
          imgWidth = availableHeight * imgAspectRatio
        }

        const x = (pageWidth - imgWidth) / 2
        const y = margin

        // 画像をPDFに追加
        pdf.addImage(imgData, "JPEG", x, y, imgWidth, imgHeight)

        // ページ情報を追加
        pdf.setFontSize(12)
        pdf.text(`ページ ${pageIndex + 1} / ${pdfPages.length}`, margin, pageHeight - margin - 20)

        // 測定結果サマリーを追加
        const pageTotal = pageMeasurements.reduce((sum, m) => sum + m.area, 0)
        pdf.text(`測定数: ${pageMeasurements.length}件`, margin, pageHeight - margin - 10)
        pdf.text(`合計面積: ${Math.round(pageTotal * 100) / 100} ${unit}²`, margin + 60, pageHeight - margin - 10)

        // 日時を追加
        pdf.text(`出力日時: ${new Date().toLocaleString("ja-JP")}`, pageWidth - margin - 80, pageHeight - margin - 10)
      }

      // PDFをダウンロード
      pdf.save(`PDF測定結果_${new Date().toISOString().split("T")[0]}.pdf`)
    } catch (error) {
      console.error("PDF出力エラー:", error)
      setError("PDF出力中にエラーが発生しました")
    } finally {
      setIsExporting(false)
    }
  }

  // 純粋なJavaScriptでエクセルファイルを生成（フォールバック）
  const generateExcelManually = () => {
    // 基本的なXMLベースのエクセルファイル構造
    const excelXML = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>PDF面積測定アプリ</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="測定結果">
  <Table>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">測定名</Data></Cell>
    <Cell><Data ss:Type="String">ページ</Data></Cell>
    <Cell><Data ss:Type="String">面積</Data></Cell>
    <Cell><Data ss:Type="String">単位</Data></Cell>
    <Cell><Data ss:Type="String">測定点数</Data></Cell>
    <Cell><Data ss:Type="String">測定日時</Data></Cell>
   </Row>
   ${allMeasurements
     .map(
       (measurement) => `
   <Row>
    <Cell><Data ss:Type="String">${measurement.name}</Data></Cell>
    <Cell><Data ss:Type="Number">${measurement.pageNumber}</Data></Cell>
    <Cell><Data ss:Type="Number">${measurement.area}</Data></Cell>
    <Cell><Data ss:Type="String">${measurement.unit}²</Data></Cell>
    <Cell><Data ss:Type="Number">${measurement.points.length}</Data></Cell>
    <Cell><Data ss:Type="String">${measurement.timestamp.toLocaleString("ja-JP")}</Data></Cell>
   </Row>`,
     )
     .join("")}
   <Row>
    <Cell><Data ss:Type="String">合計</Data></Cell>
    <Cell><Data ss:Type="String"></Data></Cell>
    <Cell><Data ss:Type="Number">${Math.round(grandTotal.totalArea * 100) / 100}</Data></Cell>
    <Cell><Data ss:Type="String">${unit}²</Data></Cell>
    <Cell><Data ss:Type="Number">${grandTotal.measurementCount}</Data></Cell>
    <Cell><Data ss:Type="String"></Data></Cell>
   </Row>
  </Table>
 </Worksheet>
</Workbook>`

    return excelXML
  }

  // 残りの関数は元のコードと同じなので省略...
  // (calculatePolygonArea, calculateTotalLength, convertPDFToImages, etc.)

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
        {/* 既存のPDF測定機能のコンテンツ */}
        {/* ... 元のコードの残りの部分 ... */}
      </main>
    </div>
  )
}

