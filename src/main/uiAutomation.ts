/**
 * Windows UI Automation - 直接讀取視窗文字元素
 * 繞過 OCR，100% 準確，極快速度
 */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface UIAutomationResult {
  text: string
  elements: UIElement[]
  success: boolean
  error?: string
}

export interface UIElement {
  name: string
  value: string
  controlType: string
  boundingRect: { x: number; y: number; width: number; height: number }
}

/**
 * 使用 PowerShell + System.Windows.Automation 讀取指定座標的文字
 */
export async function getTextFromPoint(x: number, y: number): Promise<UIAutomationResult> {
  const script = `
    Add-Type -AssemblyName UIAutomationClient
    Add-Type -AssemblyName UIAutomationTypes

    $point = New-Object System.Windows.Point(${x}, ${y})
    $element = [System.Windows.Automation.AutomationElement]::FromPoint($point)

    if ($element -eq $null) {
      Write-Output "ERROR: No element found at point"
      exit 1
    }

    $result = @{
      Name = $element.Current.Name
      ControlType = $element.Current.ControlType.ProgrammaticName
      BoundingRect = @{
        X = $element.Current.BoundingRectangle.X
        Y = $element.Current.BoundingRectangle.Y
        Width = $element.Current.BoundingRectangle.Width
        Height = $element.Current.BoundingRectangle.Height
      }
    }

    # Try to get value pattern
    try {
      $valuePattern = $element.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
      if ($valuePattern -ne $null) {
        $result.Value = $valuePattern.Current.Value
      }
    } catch {}

    # Try to get text pattern
    try {
      $textPattern = $element.GetCurrentPattern([System.Windows.Automation.TextPattern]::Pattern)
      if ($textPattern -ne $null) {
        $result.Text = $textPattern.DocumentRange.GetText(-1)
      }
    } catch {}

    ConvertTo-Json $result -Depth 3
  `

  try {
    const { stdout } = await execAsync(
      `powershell -NoProfile -NonInteractive -Command "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
      { timeout: 5000 }
    )

    const data = JSON.parse(stdout.trim())
    const text = data.Text || data.Value || data.Name || ''

    return {
      text: text.trim(),
      elements: [{
        name: data.Name || '',
        value: data.Value || data.Text || '',
        controlType: data.ControlType || '',
        boundingRect: {
          x: data.BoundingRect?.X || 0,
          y: data.BoundingRect?.Y || 0,
          width: data.BoundingRect?.Width || 0,
          height: data.BoundingRect?.Height || 0
        }
      }],
      success: true
    }
  } catch (error) {
    return {
      text: '',
      elements: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * 讀取指定區域內的所有文字元素
 */
export async function getTextFromRect(
  x: number,
  y: number,
  width: number,
  height: number
): Promise<UIAutomationResult> {
  const script = `
    Add-Type -AssemblyName UIAutomationClient
    Add-Type -AssemblyName UIAutomationTypes
    Add-Type -AssemblyName System.Drawing

    $rect = New-Object System.Drawing.Rectangle(${x}, ${y}, ${width}, ${height})
    $results = @()

    # Get root element
    $root = [System.Windows.Automation.AutomationElement]::RootElement

    # Create condition to find all elements
    $condition = [System.Windows.Automation.Condition]::TrueCondition

    # Walk through all elements and find those in our rect
    $walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker

    function Get-TextFromElement($element, $depth) {
      if ($depth -gt 10) { return @() }  # Limit depth to prevent infinite loops

      $results = @()
      $current = $walker.GetFirstChild($element)

      while ($current -ne $null) {
        try {
          $bounds = $current.Current.BoundingRectangle

          # Check if element is within our rect
          if ($bounds.X -ge ${x} -and $bounds.Y -ge ${y} -and
              ($bounds.X + $bounds.Width) -le (${x} + ${width}) -and
              ($bounds.Y + $bounds.Height) -le (${y} + ${height})) {

            $text = ""

            # Try value pattern first
            try {
              $valuePattern = $current.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
              if ($valuePattern -ne $null) { $text = $valuePattern.Current.Value }
            } catch {}

            # Try text pattern
            if ([string]::IsNullOrEmpty($text)) {
              try {
                $textPattern = $current.GetCurrentPattern([System.Windows.Automation.TextPattern]::Pattern)
                if ($textPattern -ne $null) { $text = $textPattern.DocumentRange.GetText(1000) }
              } catch {}
            }

            # Use name if no text found
            if ([string]::IsNullOrEmpty($text)) { $text = $current.Current.Name }

            if (-not [string]::IsNullOrEmpty($text)) {
              $results += @{
                Name = $current.Current.Name
                Value = $text
                ControlType = $current.Current.ControlType.ProgrammaticName
                BoundingRect = @{
                  X = $bounds.X
                  Y = $bounds.Y
                  Width = $bounds.Width
                  Height = $bounds.Height
                }
              }
            }
          }

          # Recurse into children
          $results += Get-TextFromElement $current ($depth + 1)
        } catch {}

        $current = $walker.GetNextSibling($current)
      }

      return $results
    }

    # Get element at center of rect first
    $centerX = ${x} + ${width} / 2
    $centerY = ${y} + ${height} / 2
    $centerPoint = New-Object System.Windows.Point($centerX, $centerY)
    $centerElement = [System.Windows.Automation.AutomationElement]::FromPoint($centerPoint)

    if ($centerElement -ne $null) {
      # Walk up to find a good starting point
      $parent = $centerElement
      for ($i = 0; $i -lt 5; $i++) {
        $p = $walker.GetParent($parent)
        if ($p -eq $null -or $p.Equals($root)) { break }
        $parent = $p
      }

      $allResults = Get-TextFromElement $parent 0

      # Also add the center element's text
      $text = ""
      try {
        $valuePattern = $centerElement.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
        if ($valuePattern -ne $null) { $text = $valuePattern.Current.Value }
      } catch {}

      if ([string]::IsNullOrEmpty($text)) {
        try {
          $textPattern = $centerElement.GetCurrentPattern([System.Windows.Automation.TextPattern]::Pattern)
          if ($textPattern -ne $null) { $text = $textPattern.DocumentRange.GetText(1000) }
        } catch {}
      }

      if ([string]::IsNullOrEmpty($text)) { $text = $centerElement.Current.Name }

      if (-not [string]::IsNullOrEmpty($text)) {
        $bounds = $centerElement.Current.BoundingRectangle
        $allResults = @(@{
          Name = $centerElement.Current.Name
          Value = $text
          ControlType = $centerElement.Current.ControlType.ProgrammaticName
          BoundingRect = @{
            X = $bounds.X
            Y = $bounds.Y
            Width = $bounds.Width
            Height = $bounds.Height
          }
        }) + $allResults
      }
    }

    # Remove duplicates and output
    $unique = $allResults | Sort-Object { $_.BoundingRect.Y, $_.BoundingRect.X } -Unique
    ConvertTo-Json @{ Elements = $unique } -Depth 4
  `

  try {
    const { stdout } = await execAsync(
      `powershell -NoProfile -NonInteractive -Command "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
      { timeout: 10000 }
    )

    const data = JSON.parse(stdout.trim())
    const elements: UIElement[] = (data.Elements || []).map((e: {
      Name?: string
      Value?: string
      ControlType?: string
      BoundingRect?: { X?: number; Y?: number; Width?: number; Height?: number }
    }) => ({
      name: e.Name || '',
      value: e.Value || '',
      controlType: e.ControlType || '',
      boundingRect: {
        x: e.BoundingRect?.X || 0,
        y: e.BoundingRect?.Y || 0,
        width: e.BoundingRect?.Width || 0,
        height: e.BoundingRect?.Height || 0
      }
    }))

    // Combine all text from elements
    const text = elements
      .map((e: UIElement) => e.value || e.name)
      .filter((t: string) => t && t.trim())
      .join('\n')

    return {
      text: text.trim(),
      elements,
      success: elements.length > 0
    }
  } catch (error) {
    return {
      text: '',
      elements: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * 快速檢測是否可以使用 UI Automation（測試用）
 */
export async function testUIAutomation(): Promise<boolean> {
  try {
    const result = await getTextFromPoint(100, 100)
    return result.success
  } catch {
    return false
  }
}
