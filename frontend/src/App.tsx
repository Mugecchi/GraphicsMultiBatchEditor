import React, { useEffect } from 'react';
import { useStudioStore } from './store/useStudioStore';
import { TopBar } from './components/TopBar';
import { Dashboard } from './components/Dashboard';
import { LeftSidebar } from './components/LeftSidebar';
import { CenterCanvas } from './components/CenterCanvas';
import { RightSidebar } from './components/RightSidebar';
import { BottomBar } from './components/BottomBar';
import { GenerateView } from './components/GenerateView';
import { BatchEditorView } from './components/BatchEditorView';

export const App: React.FC = () => {
  const {
    activeView,
    project,
    loadFonts,
    undo,
    redo,
    copySelectedElements,
    pasteElements,
    deleteSelectedElements,
    duplicateSelectedElements,
    nudgeSelectedElements,
    saveProjectNow,
  } = useStudioStore();

  useEffect(() => {
    loadFonts();
  }, []);

  // Global desktop keyboard shortcuts for the visual editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeView !== 'editor' || !project) return;

      // Do not hijack typing inside inputs, textareas, or selects
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isEditingInput =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        (e.target as HTMLElement)?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveProjectNow();
        return;
      }

      if (isEditingInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copySelectedElements();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        pasteElements();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelectedElements();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelectedElements();
        return;
      }

      const step = e.shiftKey ? 2.0 : 0.25;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        nudgeSelectedElements(-step, 0);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nudgeSelectedElements(step, 0);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        nudgeSelectedElements(0, -step);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        nudgeSelectedElements(0, step);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeView,
    project,
    undo,
    redo,
    copySelectedElements,
    pasteElements,
    deleteSelectedElements,
    duplicateSelectedElements,
    nudgeSelectedElements,
    saveProjectNow,
  ]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <TopBar />

      {activeView === 'dashboard' || !project ? (
        <Dashboard />
      ) : activeView === 'batch' ? (
        <>
          <BatchEditorView />
          <BottomBar />
        </>
      ) : activeView === 'generate' ? (
        <>
          <GenerateView />
          <BottomBar />
        </>
      ) : (
        <>
          <div className="flex-1 flex overflow-hidden">
            <LeftSidebar />
            <CenterCanvas />
            <RightSidebar />
          </div>
          <BottomBar />
        </>
      )}
    </div>
  );
};

export default App;
