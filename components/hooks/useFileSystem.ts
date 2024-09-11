import { useState } from 'react'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

export interface FileStructure {
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

export function useFileSystem() {
  const [fileStructure, setFileStructure] = useState<FileStructure[]>(initialFileStructure)

  const downloadFiles = async () => {
    const zip = new JSZip();

    const addToZip = (items: FileStructure[], parentPath: string = '') => {
      items.forEach((item) => {
        const fullPath = `${parentPath}${item.name}`;
        if (item.type === 'file') {
          zip.file(fullPath, item.content || '');
        } else if (item.type === 'folder' && item.children) {
          addToZip(item.children, `${fullPath}/`);
        }
      });
    };

    addToZip(fileStructure);

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'editor0_project.zip');
  }

  const readFiles = async (fileList: FileList): Promise<FileStructure[]> => {
    const files: FileStructure[] = []

    const processFile = async (file: File) => {
      const pathParts = file.webkitRelativePath.split(/[/\\]/)
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

    await Promise.all(Array.from(fileList).map(processFile))

    return files
  }

  const createNewItem = (newItemName: string, newItemType: 'file' | 'folder', parentPath?: string) => {
    const newItem: FileStructure = {
      name: newItemName,
      type: newItemType,
      path: parentPath ? `${parentPath}/${newItemName}` : newItemName,
      content: newItemType === 'file' ? '' : undefined,
      children: newItemType === 'folder' ? [] : undefined,
    };

    setFileStructure((prevStructure) => updateFileStructure(prevStructure, parentPath, newItem));
  }

  const deleteItem = (item: FileStructure | null) => {
    if (!item) return;

    setFileStructure((prevStructure) => deleteRecursively(prevStructure, item.path));
  }

  const renameItem = (item: FileStructure, newName: string) => {
    if (!item || !newName) return;

    const oldPath = item.path;
    const pathParts = oldPath.split('/');
    pathParts[pathParts.length - 1] = newName;
    const newPath = pathParts.join('/');

    setFileStructure((prevStructure) => renameRecursively(prevStructure, oldPath, newName, newPath));
  }

  const updateFileStructure = (structure: FileStructure[], parentPath: string | undefined, newItem: FileStructure): FileStructure[] => {
    if (!parentPath) {
      return [...structure, newItem];
    }

    return structure.map((item) => {
      if (item.path === parentPath && item.type === 'folder') {
        return {
          ...item,
          children: [...(item.children || []), newItem],
        };
      } else if (item.type === 'folder' && item.children) {
        return {
          ...item,
          children: updateFileStructure(item.children, parentPath, newItem),
        };
      }
      return item;
    });
  }

  const deleteRecursively = (items: FileStructure[], pathToDelete: string): FileStructure[] => {
    return items.filter((currentItem) => {
      if (currentItem.path === pathToDelete) {
        return false;
      }
      if (currentItem.type === 'folder' && currentItem.children) {
        currentItem.children = deleteRecursively(currentItem.children, pathToDelete);
      }
      return true;
    });
  }

  const renameRecursively = (items: FileStructure[], oldPath: string, newName: string, newPath: string): FileStructure[] => {
    return items.map((currentItem) => {
      if (currentItem.path === oldPath) {
        return {
          ...currentItem,
          name: newName,
          path: newPath,
        };
      }
      if (currentItem.type === 'folder' && currentItem.children) {
        return {
          ...currentItem,
          children: renameRecursively(currentItem.children, oldPath, newName, newPath),
        };
      }
      return currentItem;
    });
  }

  return {
    fileStructure,
    setFileStructure,
    downloadFiles,
    readFiles,
    createNewItem,
    deleteItem,
    renameItem,
  }
}