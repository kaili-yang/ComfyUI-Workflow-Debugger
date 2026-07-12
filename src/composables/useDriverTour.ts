import { driver } from 'driver.js'
import type { DriveStep } from 'driver.js'
import confetti from 'canvas-confetti'
import 'driver.js/dist/driver.css'

const TOUR_STEPS: DriveStep[] = [
  {
    element: '#tour-step-1',
    popover: {
      title: 'Step 1 — Upload',
      description:
        'Drag and drop a ComfyUI workflow .json, click to browse, or paste JSON. Both graph and API formats are supported.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '#tour-step-2',
    popover: {
      title: 'Step 2 — Workflow Preview',
      description:
        'Your node graph appears here with error highlights. Pan, zoom, and click a node to inspect it.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '#tour-step-3',
    popover: {
      title: 'Step 3 — Diagnostics',
      description:
        'Issues are listed by severity (Error / Warning / Info). Click an issue to jump to the related node, or fix a category individually.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '#tour-step-4',
    popover: {
      title: 'Step 4 — Fix',
      description:
        'Click Fix to repair all fixable issues in one step — broken links, type mismatches, disconnected inputs, and more.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '#tour-step-5',
    popover: {
      title: 'Step 5 — Download',
      description:
        'Export the fixed workflow JSON, then reload it into ComfyUI to continue working.',
      side: 'left',
      align: 'end',
    },
  },
]

function celebrateTourComplete(): void {
  const colors = ['#f0ff41', '#ffffff', '#afa3db', '#8d7fc5', '#172dd7']

  confetti({
    particleCount: 90,
    spread: 70,
    startVelocity: 38,
    origin: { x: 0.5, y: 0.65 },
    colors,
    disableForReducedMotion: true,
  })

  window.setTimeout(() => {
    confetti({
      particleCount: 55,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors,
      disableForReducedMotion: true,
    })
    confetti({
      particleCount: 55,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors,
      disableForReducedMotion: true,
    })
  }, 180)
}

export function startProductTour(options?: { force?: boolean }): void {
  const storageKey = 'cwd-driver-tour-done'
  if (!options?.force && localStorage.getItem(storageKey) === '1') return

  const tour = driver({
    showProgress: true,
    animate: true,
    overlayColor: '#0a090b',
    overlayOpacity: 0.72,
    stagePadding: 8,
    stageRadius: 12,
    popoverOffset: 12,
    popoverClass: 'cwd-driver-popover',
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Done',
    progressText: '{{current}} / {{total}}',
    steps: TOUR_STEPS,
    onDoneClick: (_element, _step, { driver: d }) => {
      d.destroy()
      celebrateTourComplete()
    },
    onDestroyed: () => {
      localStorage.setItem(storageKey, '1')
    },
  })

  // Wait a tick so layout / fonts settle before measuring targets
  requestAnimationFrame(() => {
    tour.drive()
  })
}

export function resetProductTour(): void {
  localStorage.removeItem('cwd-driver-tour-done')
}
