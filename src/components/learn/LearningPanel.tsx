import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, GraduationCap, X } from 'lucide-react'
import { LEARN_TOPICS } from '@/data/educational'
import { useSimulationStore } from '@/stores/simulationStore'

/**
 * Learning Center panel: short, interactive explanations of the science
 * behind the simulator. Topics expand one at a time.
 */
export function LearningPanel() {
  const [openId, setOpenId] = useState<string | null>(LEARN_TOPICS[0].id)
  const setPanel = useSimulationStore((s) => s.setPanel)

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-ag-ui-border/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <GraduationCap size={16} className="text-ag-fresh" />
          <h2 className="font-display text-sm font-bold tracking-wide text-ag-text">Learning Center</h2>
        </div>
        <button
          onClick={() => setPanel(null)}
          aria-label="Close panel"
          className="rounded-lg p-1.5 text-ag-text-dim transition hover:bg-ag-ui-light hover:text-ag-text"
        >
          <X size={16} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {LEARN_TOPICS.map((topic) => {
          const open = openId === topic.id
          return (
            <div key={topic.id} className="mb-2 overflow-hidden rounded-xl border border-ag-ui-border bg-ag-ui-light/50">
              <button
                onClick={() => setOpenId(open ? null : topic.id)}
                aria-expanded={open}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition hover:bg-ag-ui-light"
              >
                <span className="flex-1 text-xs font-bold text-ag-text">{topic.title}</span>
                <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={15} className="text-ag-text-dim" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                  >
                    <div className="border-t border-ag-ui-border/60 px-3 py-2.5">
                      <p className="mb-2 text-[11px] font-medium italic text-ag-fresh">{topic.summary}</p>
                      {topic.body.map((para, i) => (
                        <p key={i} className="mb-2 text-[11px] leading-relaxed text-ag-text-dim">
                          {para}
                        </p>
                      ))}
                      {topic.fact && (
                        <div className="rounded-lg border border-ag-fresh/40 bg-ag-fresh/10 px-2.5 py-2 text-[11px] font-medium text-ag-fresh">
                          {topic.fact}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}
