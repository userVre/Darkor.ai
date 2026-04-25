import {
InteriorRedesignStepOne,
type InteriorRedesignStepOneExamplePhoto,
} from "./interior-redesign-step-one";

type SelectedPhoto = {
  uri: string;
  label?: string;
};

type GardenRedesignStepOneProps = {
  creditCount: number;
  selectedPhotos: SelectedPhoto[];
  currentDisplayIndex: number;
  examplePhotos: InteriorRedesignStepOneExamplePhoto[];
  loadingExampleId?: string | null;
  onTakePhoto: () => Promise<boolean>;
  onChooseFromGallery: () => Promise<boolean>;
  onRemovePhoto: (index: number) => void;
  onFocusPhoto: (index: number) => void;
  onSelectExample: (example: InteriorRedesignStepOneExamplePhoto) => void;
  onContinue: () => void;
  onCreditsPress?: () => void;
  onExit: () => void;
};

export function GardenRedesignStepOne(props: GardenRedesignStepOneProps) {
  return (
    <InteriorRedesignStepOne
      {...props}
      totalSteps={3}
      emptyStateSubtitle="Upload an outdoor scene so HomeDecor AI can elevate the landscape with a composed, architectural point of view."
    />
  );
}
