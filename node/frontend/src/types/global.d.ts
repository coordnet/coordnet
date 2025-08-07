// Global type declarations for missing external library types
// DO NOT override React types - use React 19's built-in types

declare global {
  // Custom global types only
  interface Window {
    __COORDNET_CONFIG__?: any;
  }
}

// External library type declarations
declare module 'react-avatar-editor' {
  interface AvatarEditor {
    getImageScaledToCanvas(): HTMLCanvasElement;
  }
  
  interface AvatarEditorProps {
    ref?: React.Ref<AvatarEditor>;
    image?: string | File;
    width?: number;
    height?: number;
    border?: number;
    borderRadius?: number;
    scale?: number;
    rotate?: number;
    onImageReady?: () => void;
    onImageChange?: () => void;
    onMouseUp?: () => void;
    onMouseMove?: (event: React.MouseEvent) => void;
    onImageDrop?: (event: React.DragEvent) => void;
    style?: React.CSSProperties;
    className?: string;
  }
  
  declare const AvatarEditor: React.ComponentType<AvatarEditorProps>;
  export default AvatarEditor;
}

declare module 'react-dropzone' {
  interface DropzoneOptions {
    onDrop?: (acceptedFiles: File[], rejectedFiles: any[], event: React.DragEvent | React.ChangeEvent) => void;
    accept?: Record<string, string[]>;
    multiple?: boolean;
    disabled?: boolean;
    maxFiles?: number;
    maxSize?: number;
    minSize?: number;
    noClick?: boolean;
    noKeyboard?: boolean;
    noDrag?: boolean;
    preventDropOnDocument?: boolean;
    noDropOnDocument?: boolean;
  }
  
  interface DropzoneState {
    isDragActive: boolean;
    isDragAccept: boolean;
    isDragReject: boolean;
    isFocused: boolean;
    getRootProps: () => any;
    getInputProps: () => any;
    open: () => void;
  }
  
  export function useDropzone(options?: DropzoneOptions): DropzoneState;
}

declare module 'blockies-ts' {
  export function create(options: {
    seed?: string;
    color?: string;
    bgcolor?: string;
    size?: number;
    scale?: number;
  }): HTMLCanvasElement;
}

declare module 'downshift' {
  interface UseComboboxProps<Item> {
    items: Item[];
    onInputValueChange?: (changes: any) => void;
    onSelectedItemChange?: (changes: any) => void;
    itemToString?: (item: Item | null) => string;
    initialInputValue?: string;
  }
  
  interface UseComboboxReturnValue {
    isOpen: boolean;
    highlightedIndex: number;
    selectedItem: any;
    inputValue: string;
    getMenuProps: () => any;
    getInputProps: () => any;
    getItemProps: (options: { item: any; index: number }) => any;
    getComboboxProps: () => any;
    getLabelProps: () => any;
    getToggleButtonProps: () => any;
    closeMenu: () => void;
    openMenu: () => void;
    selectItem: (item: any) => void;
    setInputValue: (value: string) => void;
  }
  
  export function useCombobox<Item>(props: UseComboboxProps<Item>): UseComboboxReturnValue;
}

// Node data types for Canvas
export interface NodeData {
  title?: string;
  content?: any;
  allowed_actions?: string[];
  [key: string]: any;
}

// Skill types
export interface Skill {
  id: string;
  title: string;
  description?: string;
  authors?: any[];
  status?: string;
  [key: string]: any;
}

// Profile types
export interface Profile {
  id: string;
  profile_slug?: string;
  profile_image?: string;
  profile_image_2x?: string;
  user?: any;
  [key: string]: any;
}

// Run status enum
export enum RunStatus {
  IDLE = 'idle',
  PENDING = 'pending', 
  RUNNING = 'running',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export {};