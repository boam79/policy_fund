'use client'

import type { Dispatch, SetStateAction } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ParseNLResult } from '@/lib/query/parseNaturalLanguage'
import { AlertCircle, CheckCircle2, HelpCircle, Pencil } from 'lucide-react'
import ConditionEditInput from '@/components/diagnosis/ConditionEditInput'
import ConditionNumericStepper from '@/components/diagnosis/ConditionNumericStepper'
import {
  CONDITION_LABELS,
  MISSING_LABELS,
  NUMERIC_STEPPER_KEYS,
  conditionHasDisplayValue,
  formatConditionValue,
  missingNeedsYellowAddRow,
} from '@/components/diagnosis/diagnosisConditionUtils'

type Props = {
  parsed: ParseNLResult
  effectiveEntries: [string, { value: unknown; confidence: number; source_text?: string }][]
  stillMissingImportant: string[]
  editValues: Record<string, string>
  setEditValues: Dispatch<SetStateAction<Record<string, string>>>
  draftValues: Record<string, string>
  setDraftValues: Dispatch<SetStateAction<Record<string, string>>>
  editMode: string | null
  beginEdit: (key: string, initial?: string) => void
  handleEditSave: (key: string) => void
  handleEditCancel: () => void
}

function getConfidenceBadge(confidence: number) {
  if (confidence >= 0.8) {
    return (
      <span className="ml-1.5 flex items-center gap-0.5 text-xs text-green-600">
        <CheckCircle2 className="h-3 w-3" /> 확인
      </span>
    )
  }
  if (confidence >= 0.4) {
    return (
      <span className="ml-1.5 flex items-center gap-0.5 text-xs text-yellow-600">
        <HelpCircle className="h-3 w-3" /> 추정
      </span>
    )
  }
  return (
    <span className="ml-1.5 flex items-center gap-0.5 text-xs text-red-500">
      <AlertCircle className="h-3 w-3" /> 불확실
    </span>
  )
}

export function DiagnosisConditionEditor({
  parsed,
  effectiveEntries,
  stillMissingImportant,
  editValues,
  setEditValues,
  draftValues,
  setDraftValues,
  editMode,
  beginEdit,
  handleEditSave,
  handleEditCancel,
}: Props) {
  return (
    <>
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">추출된 조건 확인</CardTitle>
          <p className="text-xs text-muted-foreground">
            AI가 추출한 조건을 확인하고 수정해주세요. 정확할수록 검색 결과가 향상됩니다.
          </p>
        </CardHeader>
        <CardContent>
          {effectiveEntries.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              추출된 조건이 없습니다. 질문을 더 구체적으로 입력해주세요.
            </p>
          ) : (
            <div className="space-y-2">
              {effectiveEntries.map(([key, cond]) => {
                const c = cond as { value: unknown; confidence: number; source_text?: string }
                const label = CONDITION_LABELS[key] ?? key
                const displayValue = formatConditionValue(key, editValues[key] ?? c.value, c.source_text)
                const useStepper = NUMERIC_STEPPER_KEYS.has(key) && c.confidence < 0.4 && editMode !== key
                const numericRaw = editValues[key] ?? String(c.value ?? '0')
                const numericVal = Number(String(numericRaw).replace(/,/g, ''))

                return (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-lg border px-4 py-2.5 hover:bg-muted/30"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        {getConfidenceBadge(c.confidence)}
                      </div>
                      {useStepper && Number.isFinite(numericVal) ? (
                        <div className="mt-1">
                          <ConditionNumericStepper
                            value={numericVal}
                            min={0}
                            max={key === 'employee_count' ? 50000 : 100}
                            unit={key === 'business_age_years' ? '년' : '명'}
                            onChange={(n) => setEditValues((prev) => ({ ...prev, [key]: String(n) }))}
                          />
                        </div>
                      ) : editMode === key ? (
                        <div className="mt-1 flex items-center gap-2">
                          <ConditionEditInput
                            value={draftValues[key] ?? ''}
                            onChange={(v) => setDraftValues((prev) => ({ ...prev, [key]: v }))}
                            onSave={() => handleEditSave(key)}
                            onCancel={handleEditCancel}
                            placeholder={
                              key === 'industry' ? '예: 응용소프트웨어업, 제조업, IT' : undefined
                            }
                            className="h-7 min-w-[10rem] rounded border px-2 text-sm outline-none focus:border-primary"
                          />
                          <button
                            type="button"
                            onClick={() => handleEditSave(key)}
                            className={cn(buttonVariants({ size: 'sm' }), 'h-7 px-2 text-xs')}
                          >
                            저장
                          </button>
                          <button
                            type="button"
                            onClick={handleEditCancel}
                            className={cn(
                              buttonVariants({ variant: 'ghost', size: 'sm' }),
                              'h-7 px-2 text-xs'
                            )}
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm font-medium">{displayValue}</span>
                      )}
                    </div>
                    {editMode !== key && !useStepper && (
                      <button
                        type="button"
                        onClick={() => beginEdit(key, String(c.value ?? ''))}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {stillMissingImportant.length > 0 && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-yellow-700">
            <HelpCircle className="h-4 w-4" /> 추가 입력 시 더 정확한 결과
          </p>
          <div className="flex flex-wrap gap-1.5">
            {stillMissingImportant.map((item) => (
              <Badge
                key={item}
                variant="outline"
                className="border-yellow-300 bg-white text-xs text-yellow-700"
              >
                {MISSING_LABELS[item] ?? item}
              </Badge>
            ))}
          </div>
          {stillMissingImportant.some(
            (k) =>
              !conditionHasDisplayValue(parsed, editValues, k) &&
              missingNeedsYellowAddRow(parsed, k)
          ) && (
            <div className="mt-3 space-y-2 border-t border-yellow-200/80 pt-3">
              <p className="text-xs text-yellow-800">아래에서 직접 입력할 수 있습니다.</p>
              {stillMissingImportant
                .filter(
                  (k) =>
                    !conditionHasDisplayValue(parsed, editValues, k) &&
                    missingNeedsYellowAddRow(parsed, k)
                )
                .map((key) => (
                  <div
                    key={key}
                    className="flex flex-col gap-2 rounded-md border border-yellow-200/80 bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="text-sm font-medium text-yellow-900">
                      {MISSING_LABELS[key] ?? key}
                    </span>
                    {NUMERIC_STEPPER_KEYS.has(key) ? (
                      <ConditionNumericStepper
                        value={Number(editValues[key] ?? '0') || 0}
                        min={0}
                        max={key === 'employee_count' ? 50000 : 100}
                        unit={key === 'business_age_years' ? '년' : '명'}
                        onChange={(n) => setEditValues((prev) => ({ ...prev, [key]: String(n) }))}
                      />
                    ) : editMode === key ? (
                      <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
                        <ConditionEditInput
                          value={draftValues[key] ?? ''}
                          onChange={(v) => setDraftValues((prev) => ({ ...prev, [key]: v }))}
                          onSave={() => handleEditSave(key)}
                          onCancel={handleEditCancel}
                          placeholder={
                            key === 'industry'
                              ? '예: 응용소프트웨어업, 제조업, IT'
                              : '값을 입력하세요'
                          }
                          className="h-8 min-w-[12rem] flex-1 rounded border px-2 text-sm outline-none focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => handleEditSave(key)}
                          className={cn(buttonVariants({ size: 'sm' }), 'h-8 shrink-0 text-xs')}
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          onClick={handleEditCancel}
                          className={cn(
                            buttonVariants({ variant: 'ghost', size: 'sm' }),
                            'h-8 shrink-0 text-xs'
                          )}
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => beginEdit(key, '')}
                        className={cn(
                          buttonVariants({ variant: 'secondary', size: 'sm' }),
                          'h-8 w-full shrink-0 text-xs sm:w-auto'
                        )}
                      >
                        입력하기
                      </button>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
