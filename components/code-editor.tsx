'use client'

import { useEffect, useRef, useState } from 'react'
import { Folder, File, ChevronDown, ChevronRight, Sun, Moon, FolderOpen, Download } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import dynamic from 'next/dynamic'


export function Spinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin dark:border-secondary">
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  )
}

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <Spinner />,
})

interface FileStructure {
  name: string
  type: 'file' | 'folder'
  children?: FileStructure[]
  content?: string
}

const intialFileStructure: FileStructure[] = [
  { name: 'README.md', type: 'file', content: '# Welcome to Editor0\n\nYou can download the project as a zip file by clicking the download button on the left.\n\nYou can also select a folder to open in the editor by clicking the select folder button.\n\nClick on a file on the left to start editing it.\n\nEnjoy!' },
]

export function CodeEditor() {
  const [fileStructure, setFileStructure] = useState<FileStructure[]>(intialFileStructure)
  const [selectedFile, setSelectedFile] = useState<FileStructure | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [isDarkMode, setIsDarkMode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const toggleFolder = (folderName: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(folderName)) {
        newSet.delete(folderName)
      } else {
        newSet.add(folderName)
      }
      return newSet
    })
  }

  const downloadFiles = async () => {
    const zip = new JSZip()

    const addFilesToZip = (files: FileStructure[], folder: JSZip) => {
      files.forEach((file) => {
        if (file.type === 'folder' && file.children) {
          const newFolder = folder.folder(file.name)
          if (newFolder) {
            addFilesToZip(file.children, newFolder)
          }
        } else if (file.type === 'file' && file.content) {
          folder.file(file.name, file.content)
        }
      })
    }

    addFilesToZip(fileStructure, zip)

    const content = await zip.generateAsync({ type: 'blob' })
    saveAs(content, 'project.zip')
  }

  const selectFolder = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const newFileStructure = await readFiles(files)
      setFileStructure(newFileStructure)
    }
  }

  const readFiles = async (fileList: FileList) => {
    const files: FileStructure[] = []

    for (const file of Array.from(fileList)) {
      const pathParts = file.webkitRelativePath.split('/')
      let currentLevel = files

      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i]
        if (i === pathParts.length - 1) {
          const content = await file.text()
          currentLevel.push({ name: part, type: 'file', content })
        } else {
          let folder = currentLevel.find(f => f.name === part && f.type === 'folder')
          if (!folder) {
            folder = { name: part, type: 'folder', children: [] }
            currentLevel.push(folder)
          }
          currentLevel = folder.children!
        }
      }
    }

    return files
  }

  const renderFileStructure = (items: FileStructure[], depth = 0) => {
    return items.map((item) => (
      <div key={item.name} style={{ paddingLeft: `${depth * 16}px` }}>
        {item.type === 'folder' ? (
          <Button
            variant="ghost"
            className="w-full justify-start p-2 text-sm"
            onClick={() => toggleFolder(item.name)}
          >
            {expandedFolders.has(item.name) ? (
              <ChevronDown className="mr-2 h-4 w-4" />
            ) : (
              <ChevronRight className="mr-2 h-4 w-4" />
            )}
            <Folder className="mr-2 h-4 w-4" />
            {item.name}
          </Button>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start p-2 text-sm"
            onClick={() => setSelectedFile(item)}
          >
            <File className="mr-2 h-4 w-4" />
            {item.name}
          </Button>
        )}
        {item.type === 'folder' && expandedFolders.has(item.name) && item.children && (
          <div>{renderFileStructure(item.children, depth + 1)}</div>
        )}
      </div>
    ))
  }

  return (
    <div className={`flex justify-center items-center min-h-screen ${isDarkMode ? 'bg-neutral-800' : 'bg-gray-100'}`}>
      <div className={`flex w-full max-w-6xl h-[80vh] shadow-lg rounded-lg overflow-hidden ${isDarkMode ? 'bg-vscode' : 'bg-white text-gray-900'}`}>
        <div className={`w-64 border-r ${isDarkMode ? 'border-neutral-700' : 'border-gray-200'}`}>
          <ScrollArea className="h-full">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">editor0</h2>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 p-0"
                    aria-label="Download project"
                    onClick={downloadFiles}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 p-0"
                    aria-label="Select folder"
                    onClick={selectFolder}
                  >
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="h-8 w-8 p-0"
                  >
                    {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>
                </div>    
              </div>
              {renderFileStructure(fileStructure)}
            </div>
          </ScrollArea>
        </div>
        <div className="flex-1 relative">
          {selectedFile ? (
            <MonacoEditor
              height="100%"
              path={"file:///src/" + selectedFile.name}
              theme={isDarkMode ? "vs-dark" : "light"}
              value={selectedFile.content}
              loading={<Spinner />}
              options={{
                minimap: { enabled: false },
                fontSize: 16,
                wordWrap: 'on',
                padding: { top: 16, bottom: 16 },
                fixedOverflowWidgets: true,
              }}
              onChange={(value) => {
                if (selectedFile) {
                  selectedFile.content = value || ''
                }
              }}
            
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Select a file to start editing
              </p>
            </div>
          )}
        </div>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        {...({ webkitdirectory: 'true' } as React.InputHTMLAttributes<HTMLInputElement>)}
        onChange={handleFileInputChange}
      />
    </div>
  )
}
