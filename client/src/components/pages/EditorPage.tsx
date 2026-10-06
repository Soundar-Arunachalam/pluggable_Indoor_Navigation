import React from 'react';
import { useVenueStore } from '../../stores/venueStore';
import { useEditorStore } from '../../stores/editorStore';
import { useUIStore } from '../../stores/uiStore';
import { ToolSidebar } from '../editor/ToolSidebar';
import { EditorCanvas } from '../editor/EditorCanvas';
import { PropertiesSidebar } from '../editor/PropertiesSidebar';
import { VerticalLinkModal } from '../editor/VerticalLinkModal';
import { QRGeneratorModal } from '../editor/QRGeneratorModal';
import { IMDFExportModal } from '../editor/IMDFExportModal';
import { UploadLayoutModal } from '../editor/UploadLayoutModal';
import { api } from '../../api/client';

export const EditorPage: React.FC = () => {
  const { currentVenue, levels, activeLevel, levelMap, setLevelMap, selectLevel, fetchVenueDetails } = useVenueStore();
  const { activeTool, isSaving, hasUnsavedChanges, setActiveTool, pushHistory, saveGeometry, undo, redo, canUndo, canRedo } = useEditorStore();
  const { isIMDFExportOpen, isQRGeneratorOpen, isVerticalLinkerOpen, isUploadLayoutOpen, openModal, closeModal } = useUIStore();

  const handleMapUpdated = (updated: any) => {
    setLevelMap(updated);
    pushHistory(updated);
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      <ToolSidebar
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        levels={levels}
        activeLevel={activeLevel}
        onSelectLevel={selectLevel}
        onSave={() => {
          if (currentVenue && activeLevel && levelMap) {
            saveGeometry(currentVenue.id, activeLevel.id, levelMap);
          }
        }}
        onOpenExportModal={() => openModal('isIMDFExportOpen')}
        onOpenQRGenerator={() => openModal('isQRGeneratorOpen')}
        onOpenVerticalLinker={() => openModal('isVerticalLinkerOpen')}
        onOpenUploadModal={() => openModal('isUploadLayoutOpen')}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        canUndo={canUndo()}
        canRedo={canRedo()}
        onUndo={() => { const m = undo(); if (m) setLevelMap(m); }}
        onRedo={() => { const m = redo(); if (m) setLevelMap(m); }}
      />

      <div className="flex-1 relative overflow-hidden bg-slate-100 dark:bg-slate-950">
        <EditorCanvas
          levelMap={levelMap}
          activeLevel={activeLevel}
          activeTool={activeTool}
          onMapUpdated={handleMapUpdated}
        />
      </div>

      <PropertiesSidebar />

      <UploadLayoutModal
        isOpen={isUploadLayoutOpen}
        onClose={() => closeModal('isUploadLayoutOpen')}
        venue={currentVenue}
        activeLevel={activeLevel}
        onLayoutImported={async (importedVenueId) => {
          closeModal('isUploadLayoutOpen');
          const targetId = importedVenueId || currentVenue?.id;
          if (targetId) await fetchVenueDetails(targetId);
        }}
      />

      <IMDFExportModal
        isOpen={isIMDFExportOpen}
        onClose={() => closeModal('isIMDFExportOpen')}
        venue={currentVenue}
      />

      <QRGeneratorModal
        isOpen={isQRGeneratorOpen}
        onClose={() => closeModal('isQRGeneratorOpen')}
        venue={currentVenue}
      />

      <VerticalLinkModal
        isOpen={isVerticalLinkerOpen}
        onClose={async () => {
          closeModal('isVerticalLinkerOpen');
          if (currentVenue && activeLevel) {
            const map = await api.getLevelMap(currentVenue.id, activeLevel.id);
            setLevelMap(map);
          }
        }}
        venue={currentVenue}
        levels={levels}
      />
    </div>
  );
};
