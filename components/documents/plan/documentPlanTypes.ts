'use client'

import type { ElementType } from 'react'

export type DocumentPlanTab = 'plan' | 'checklist' | 'timeline'

export interface Section {
  order?: number
  title: string
  draft?: string
  guideline?: string
  fillInRequired?: string[]
  subsections?: { title: string; draft: string; fillInRequired?: string[] }[]
}

export interface ChecklistItem {
  name: string
  issuer: string
  issuanceDays: number
  collectBy?: string
  url?: string
  note?: string
  requirementType: string
  isStandardDocument: boolean
}

export interface Milestone {
  stage: string
  date: string
  dow: string
  isWeekend: boolean
  description: string
  actionItems: string[]
  urgency: string
}

export type TabButtonDef = [DocumentPlanTab, string, ElementType]
