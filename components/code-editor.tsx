'use client'

import React, { useRef, useState } from 'react'
import { Folder, File, ChevronDown, ChevronRight, Sun, Moon, FolderOpen, Download, Plus, Trash, Edit } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  path: string
}

const initialFileStructure: FileStructure[] = [
  { 
    name: 'Documents', 
    type: 'folder', 
    path: 'Documents',
    children: [
      { name: 'README.md', type: 'file', content: '# Welcome to Editor0\n\nYou can download the project as a zip file by clicking the download button on the left.\n\nYou can also select a folder to open in the editor by clicking the select folder button.\n\nClick on a file on the left to start editing it.\n\nEnjoy!', path: 'Documents/README.md' },
    ],
  },
]

export function CodeEditor() {
  const [fileStructure, setFileStructure] = useState<FileStructure[]>(initialFileStructure)
  const [selectedFile, setSelectedFile] = useState<FileStructure | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [isDarkMode, setIsDarkMode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: FileStructure | null } | null>(null)
  const [isNewItemDialogOpen, setIsNewItemDialogOpen] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemType, setNewItemType] = useState<'file' | 'folder'>('file')
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [renameItemName, setRenameItemName] = useState('')
  const [contextItem, setContextItem] = useState<FileStructure | null>(null)

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
      let currentPath = ''

      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i]
        currentPath += (currentPath ? '/' : '') + part
        if (i === pathParts.length - 1) {
          const content = await file.text()
          currentLevel.push({ name: part, type: 'file', content, path: currentPath })
        } else {
          let folder = currentLevel.find(f => f.name === part && f.type === 'folder')
          if (!folder) {
            folder = { name: part, type: 'folder', children: [], path: currentPath }
            currentLevel.push(folder)
          }
          currentLevel = folder.children!
        }
      }
    }

    return files
  }

  const handleContextMenu = (event: React.MouseEvent, item: FileStructure) => {
    event.preventDefault()
    setContextMenu({ x: event.clientX, y: event.clientY, item })
    setContextItem(item)
  }

  const closeContextMenu = () => {
    setContextMenu(null)
  }

  const handleNewItem = (type: 'file' | 'folder') => {
    setNewItemType(type)
    setIsNewItemDialogOpen(true)
    closeContextMenu()
  }

  const createNewItem = () => {
    if (newItemName && contextItem) {
      const newItem: FileStructure = {
        name: newItemName,
        type: newItemType,
        path: `${contextItem.path}/${newItemName}`,
        ...(newItemType === 'folder' ? { children: [] } : { content: '' }),
      }

      const updateFileStructure = (items: FileStructure[]): FileStructure[] => {
        return items.map(item => {
          if (item.path === contextItem?.path) {
            if (item.type === 'folder') {
              return { ...item, children: [...(item.children || []), newItem] }
            }
          } else if (item.type === 'folder' && item.children) {
            return { ...item, children: updateFileStructure(item.children) }
          }
          return item
        })
      }

      setFileStructure(updateFileStructure(fileStructure))
      setIsNewItemDialogOpen(false)
      setNewItemName('')
    }
  }


  const deleteItem = (item: FileStructure | null, items: FileStructure[]): FileStructure[] => {
    if (!item?.path) {
      return items;
    }
  
    const parts = item.path.split('/');
    if (parts.length === 1) {
      return items.filter(i => i.path !== item.path);
    }
  
    const parentPath = parts.slice(0, -1).join('/');
    const itemName = parts[parts.length - 1];
  
    return items.map(i => {
      if (i.path === parentPath && i.type === 'folder' && i.children) {
        return { ...i, children: i.children.filter(c => c.name !== itemName) };
      } else if (i.type === 'folder' && i.children) {
        return { ...i, children: deleteItem(item, i.children) };
      }
      return i;
    });
  };

  const handleDeleteItem = () => {
    if (contextItem) {
      const newFileStructure = deleteItem(contextItem, fileStructure)
      console.log(newFileStructure)
      setFileStructure(newFileStructure)
    }
    closeContextMenu()
  }

  const handleRenameItem = () => {
    if (contextMenu?.item) {
      setRenameItemName(contextMenu.item.name)
      setIsRenameDialogOpen(true)
    }
  }

  const renameItem = () => {
    if (renameItemName && contextItem) {
      const renameItem = (items: FileStructure[]): FileStructure[] => {
        return items.map(item => {
          if (item.path === contextItem.path) {
            return { ...item, name: renameItemName }
          } else if (item.type === 'folder' && item.children) {
            return { ...item, children: renameItem(item.children) }
          }
          return item
        })
      }

      setFileStructure(renameItem(fileStructure))
      setIsRenameDialogOpen(false)
      setRenameItemName('')
    }
  }

  const renderFileStructure = (items: FileStructure[], depth = 0) => {
    items.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name)
      }
      return a.type === 'folder' ? -1 : 1
    })

    return items.map((item) => (
      <React.Fragment key={item.path}>
      <div
        style={{ paddingLeft: `${depth * 16}px` }}
        onContextMenu={(e) => handleContextMenu(e, item)}
      >
        <Button
          variant="ghost"
          className="w-full justify-start p-2 text-sm"
          onClick={() => item.type === 'folder' ? toggleFolder(item.name) : setSelectedFile(item)}
        >
          {item.type === 'folder' && (
            expandedFolders.has(item.name) ? (
              <ChevronDown className="mr-2 h-4 w-4" />
            ) : (
              <ChevronRight className="mr-2 h-4 w-4" />
            )
          )}
          {item.type === 'folder' ? (
            <Folder className="mr-2 h-4 w-4" />
          ) : (
            <File className="mr-2 h-4 w-4" />
          )}
          {item.name}
        </Button>
      </div>
      {item.type === 'folder' && expandedFolders.has(item.name) && item.children && (
        <div>{renderFileStructure(item.children, depth + 1)}</div>
      )}
      </React.Fragment>
    ))
  }

  return (
    <div className={`flex justify-center items-center min-h-screen ${isDarkMode ? 'bg-neutral-800' : 'bg-gray-100'}`} onClick={closeContextMenu}>
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
              path={selectedFile.path}
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
      {contextMenu && (
        <DropdownMenu open={true} onOpenChange={closeContextMenu}>
          <DropdownMenuTrigger asChild>
            <div style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x }} />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {contextMenu.item?.type === 'folder' && (
              <>
                <DropdownMenuItem onClick={() => handleNewItem('file')}>
                  <Plus className="mr-2 h-4 w-4" />
                  New File
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleNewItem('folder')}>
                  <Folder className="mr-2 h-4 w-4" />
                  New Folder
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem onClick={handleRenameItem}>
              <Edit className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDeleteItem}>
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <Dialog open={isNewItemDialogOpen} onOpenChange={setIsNewItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New {newItemType === 'file' ? 'File' : 'Folder'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                autoComplete="off"
                id="name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createNewItem}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Item</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rename" className="text-right">
                New Name
              </Label>
              <Input
                id="rename"
                value={renameItemName}
                onChange={(e) => setRenameItemName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={renameItem}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}