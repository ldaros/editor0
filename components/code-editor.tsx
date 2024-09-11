'use client'

import React, { useRef, useState, useCallback } from 'react'
import { Folder, File, ChevronDown, ChevronRight, Sun, Moon, FolderOpen, Download, Plus, Trash, Edit } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import dynamic from 'next/dynamic'
import { useFileSystem, FileStructure } from '@/components/hooks/useFileSystem'

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

export function CodeEditor() {
  const { fileStructure, setFileStructure, downloadFiles, readFiles, createNewItem, deleteItem, renameItem } = useFileSystem()
  const [selectedFile, setSelectedFile] = useState<FileStructure | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [isDarkMode, setIsDarkMode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: FileStructure | null } | null>(null)
  const [dialogState, setDialogState] = useState({
    isNewItemDialogOpen: false,
    isRenameDialogOpen: false,
    newItemName: '',
    newItemType: 'file' as 'file' | 'folder',
    renameItemName: '',
  })
  const [contextItem, setContextItem] = useState<FileStructure | null>(null)

  const toggleFolder = useCallback((folderName: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(folderName)) {
        newSet.delete(folderName)
      } else {
        newSet.add(folderName)
      }
      return newSet
    })
  }, [])

  const selectFolder = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [])

  const handleFileInputChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      await readFiles(files)
    }
  }, [readFiles])

  const handleContextMenu = useCallback((event: React.MouseEvent, item: FileStructure) => {
    event.preventDefault()
    setContextMenu({ x: event.clientX, y: event.clientY, item })
    setContextItem(item)
  }, [])

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const handleNewItem = useCallback((type: 'file' | 'folder') => {
    setDialogState(prev => ({
      ...prev,
      isNewItemDialogOpen: true,
      newItemType: type,
    }))
    closeContextMenu()
  }, [closeContextMenu])

  const handleCreateNewItem = useCallback(() => {
    if (dialogState.newItemName && contextItem) {
      createNewItem(dialogState.newItemName, dialogState.newItemType, contextItem.path)
      setDialogState(prev => ({
        ...prev,
        isNewItemDialogOpen: false,
        newItemName: '',
      }))
    }
  }, [createNewItem, contextItem, dialogState.newItemName, dialogState.newItemType])

  const handleDeleteItem = useCallback(() => {
    if (contextItem) {
      deleteItem(contextItem)
    }
    closeContextMenu()
  }, [deleteItem, contextItem, closeContextMenu])

  const handleRenameItem = useCallback(() => {
    if (contextMenu?.item) {
      setDialogState(prev => ({
        ...prev,
        isRenameDialogOpen: true,
        renameItemName: contextMenu?.item?.name ?? '',
      }))
    }
  }, [contextMenu])

  const handleRenameConfirm = useCallback(() => {
    if (dialogState.renameItemName && contextItem) {
      renameItem(contextItem, dialogState.renameItemName)
      setDialogState(prev => ({
        ...prev,
        isRenameDialogOpen: false,
        renameItemName: '',
      }))
    }
  }, [renameItem, contextItem, dialogState.renameItemName])

  const renderFileStructure = useCallback((items: FileStructure[], depth = 0) => {
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
  }, [expandedFolders, handleContextMenu, toggleFolder])

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
      <Dialog open={dialogState.isNewItemDialogOpen} onOpenChange={(open) => setDialogState(prev => ({ ...prev, isNewItemDialogOpen: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New {dialogState.newItemType === 'file' ? 'File' : 'Folder'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                autoComplete="off"
                id="name"
                value={dialogState.newItemName}
                onChange={(e) => setDialogState(prev => ({ ...prev, newItemName: e.target.value }))}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateNewItem}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={dialogState.isRenameDialogOpen} onOpenChange={(open) => setDialogState(prev => ({ ...prev, isRenameDialogOpen: open }))}>
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
                value={dialogState.renameItemName}
                onChange={(e) => setDialogState(prev => ({ ...prev, renameItemName: e.target.value }))}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleRenameConfirm}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}