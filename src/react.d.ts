declare module 'react' {
  function useState<T>(initialState: T | (() => T)): [T, (value: T | ((val: T) => T)) => void];
  function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
  function useMemo<T>(factory: () => T, deps: any[]): T;
  function useContext<T>(context: any): T;
  function useRef<T>(initialValue: T): { current: T };
  function useReducer<S, A>(reducer: (state: S, action: A) => S, initialState: S): [S, (action: A) => void];
  
  interface FC<P = {}> {
    (props: P & { children?: any }): any;
    displayName?: string;
  }
  
  const Fragment: any;
  const StrictMode: any;
  const Suspense: any;
  
  function forwardRef<T, P = {}>(render: (props: P, ref: any) => any): (props: P & { ref?: any }) => any;
  function memo<T extends FC<any>>(component: T, propsAreEqual?: (prevProps: any, nextProps: any) => boolean): T;
  function lazy<T extends FC<any>>(factory: () => Promise<{ default: T }>): T;
  
  const version: string;
}

declare module 'react/jsx-runtime' {
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
  export const Fragment: any;
}

