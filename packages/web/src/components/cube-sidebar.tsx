import { useState } from "react";
import { Menu } from "lucide-react";
import type { CubeController } from "../app/hooks/use-cube-controller";
import type { SolutionPlayback } from "../app/hooks/use-solution-playback";
import CubeControls from "./cube-controls";
import { CubeNetEditor } from "./cube-net-editor";
import { SolutionPanel } from "./solution-panel";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";

interface CubeSidebarProps extends CubeController {
  playback: SolutionPlayback;
}

function SidebarTabs({
  controller,
  playback,
  activeTab,
  onTabChange,
  onTutorialStart,
}: {
  controller: CubeController;
  playback: SolutionPlayback;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onTutorialStart: () => void;
}) {
  const {
    isBusy,
    executeMove,
    executeMoves,
    scramble,
    solveCube,
    canSolve,
    reset,
    stop,
    size,
    setSize,
    loadState,
    getCanonicalState,
  } = controller;

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="flex h-full flex-col">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="play">Play</TabsTrigger>
        <TabsTrigger value="setup">Setup</TabsTrigger>
        <TabsTrigger value="learn">Learn</TabsTrigger>
      </TabsList>

      <TabsContent value="play" className="mt-4 flex-1 overflow-y-auto">
        <CubeControls
          isBusy={isBusy}
          executeMove={executeMove}
          executeMoves={executeMoves}
          scramble={scramble}
          solveCube={solveCube}
          canSolve={canSolve}
          reset={reset}
          stop={stop}
          size={size}
          onSizeChange={setSize}
          onTutorialStart={onTutorialStart}
        />
      </TabsContent>

      <TabsContent value="setup" className="mt-4 flex-1 overflow-y-auto">
        <CubeNetEditor
          canEdit={canSolve}
          getCanonicalState={getCanonicalState}
          onApply={loadState}
          onApplied={() => onTabChange("play")}
        />
      </TabsContent>

      <TabsContent value="learn" className="mt-4 flex-1 overflow-y-auto">
        <SolutionPanel playback={playback} isBusy={isBusy} />
      </TabsContent>
    </Tabs>
  );
}

export function CubeSidebar(props: CubeSidebarProps) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("play");
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleTutorialStart = () => {
    props.playback.buildPlan();
    setActiveTab("learn");
    if (isMobile) setSheetOpen(false);
  };

  const tabs = (
    <SidebarTabs
      controller={props}
      playback={props.playback}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onTutorialStart={handleTutorialStart}
    />
  );

  if (isMobile) {
    return (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button className="fixed bottom-4 right-4 z-20 shadow-lg" size="lg">
            <Menu className="mr-2 size-5" />
            Controls
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Cube Controls</SheetTitle>
          </SheetHeader>
          <div className="mt-4">{tabs}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Card className="flex max-h-[calc(100vh-76px)] w-80 shrink-0 flex-col overflow-hidden xl:w-96">
      <CardHeader className="pb-2">
        <CardTitle>Cube Controls</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto pb-6">{tabs}</CardContent>
    </Card>
  );
}
