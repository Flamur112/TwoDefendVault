/**
 * Verify folder upload helpers — run: npx tsx scripts/test-folder-upload.ts
 */
import { buildFolderTree, collectFolderPaths, countFilesInFolder } from '../utils/file-tree.ts'
import { chunkArray, isBlockedFilename, partitionUploadFiles } from '../utils/file-validation.ts'
import { CLIENT_FOLDER_UPLOAD_MAX } from '../utils/file-path.ts'
import { FILE_MAX_BYTES } from '../utils/file-limits.ts'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function makeMockFile(name: string, relativePath: string, size = 100): File {
  const file = new File(['x'.repeat(size)], name, { type: 'text/plain' })
  Object.defineProperty(file, 'webkitRelativePath', { value: relativePath })
  return file
}

const thirtyFiles = Array.from({ length: 30 }, (_, i) => ({
  id: String(i + 1),
  name: `file-${i + 1}.txt`,
  relativePath: `Project/docs/file-${i + 1}.txt`,
  mime: 'text/plain',
  size: 100 + i,
}))

const tree = buildFolderTree(thirtyFiles)
assert(countFilesInFolder(tree) === 30, 'expected 30 files in tree')
assert(collectFolderPaths(tree).includes('Project'), 'expected Project folder')
assert(collectFolderPaths(tree).includes('Project/docs'), 'expected Project/docs folder')

const deepTree = buildFolderTree([{
  id: 'deep',
  name: 'leaf.txt',
  relativePath: 'a/b/c/d/e/leaf.txt',
  mime: 'text/plain',
  size: 10,
}])
assert(countFilesInFolder(deepTree) === 1, 'deep tree should contain one file')

const mixedFiles = [
  makeMockFile('readme.pdf', 'Folder/readme.pdf'),
  makeMockFile('script.js', 'Folder/script.js'),
  makeMockFile('notes.txt', 'Folder/notes.txt'),
]
const { uploadable, skipped } = partitionUploadFiles(mixedFiles, FILE_MAX_BYTES)
assert(uploadable.length === 2, 'expected 2 uploadable files')
assert(skipped.length === 1, 'expected 1 skipped file')
assert(isBlockedFilename('script.js'), 'js should be blocked')

const hundredFive = Array.from({ length: 105 }, (_, i) =>
  makeMockFile(`f-${i}.txt`, `Bulk/f-${i}.txt`),
)
const chunks = chunkArray(hundredFive, CLIENT_FOLDER_UPLOAD_MAX)
assert(chunks.length === 2, 'expected 2 chunks for 105 files')
assert(chunks[0].length === 100, 'first chunk should be 100')
assert(chunks[1].length === 5, 'second chunk should be 5')

console.log('All folder upload checks passed.')
