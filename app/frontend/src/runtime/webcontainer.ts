import { WebContainer } from '@webcontainer/api'

let wc: WebContainer | null = null

export async function bootWebContainer(files: Record<string, string>) {
  if (!wc) {
    wc = await WebContainer.boot()

    const mountFiles: any = {}

    Object.entries(files).forEach(([name, content]) => {
      mountFiles[name] = {
        file: { contents: content }
      }
    })

    await wc.mount(mountFiles)
  }

  return wc
}

export function getContainer() {
  return wc
}
