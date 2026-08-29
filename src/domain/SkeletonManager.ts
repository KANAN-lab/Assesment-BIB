/**
 * OOP Domain Model: Skeleton Loader Engine
 * Provides Object-Oriented skeleton schema generation for lazy loading screens.
 * Eliminates repetitive skeleton markup across views.
 */

export type SkeletonType = 
  | 'dashboard'
  | 'card-grid'
  | 'table'
  | 'chart'
  | 'modal'
  | 'profile'
  | 'leaderboard';

export interface SkeletonOptions {
  count?: number;
  gridCols?: number;
  title?: string;
  showAvatar?: boolean;
  rows?: number;
}

export interface SkeletonNode {
  id: string;
  type: 'box' | 'text' | 'circle' | 'card' | 'grid' | 'table-row';
  width?: string;
  height?: string;
  className?: string;
  children?: SkeletonNode[];
}

export class SkeletonSchema {
  constructor(
    public readonly type: SkeletonType,
    public readonly nodes: SkeletonNode[],
    public readonly containerClassName: string = 'w-full animate-pulse space-y-4'
  ) {}
}

/**
 * Abstract Base Class for OOP Skeleton Builders
 */
export abstract class BaseSkeletonBuilder {
  protected options: SkeletonOptions;

  constructor(options: SkeletonOptions = {}) {
    this.options = options;
  }

  public abstract buildSchema(): SkeletonSchema;
}

/**
 * Concrete Builder: Dashboard Skeleton (Header, Stats Cards, Main Grid & Radar Chart)
 */
export class DashboardSkeletonBuilder extends BaseSkeletonBuilder {
  public buildSchema(): SkeletonSchema {
    const nodes: SkeletonNode[] = [
      // Banner / Header skeleton
      {
        id: 'header-banner',
        type: 'card',
        height: 'h-44',
        className: 'bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-6 flex flex-col justify-between',
        children: [
          { id: 'h-title', type: 'text', width: 'w-1/3', height: 'h-7', className: 'bg-zinc-800 rounded-lg' },
          { id: 'h-sub', type: 'text', width: 'w-1/2', height: 'h-4', className: 'bg-zinc-800/70 rounded-md' },
          { id: 'h-actions', type: 'box', width: 'w-48', height: 'h-10', className: 'bg-zinc-800 rounded-xl' }
        ]
      },
      // Stats Cards Grid
      {
        id: 'stats-grid',
        type: 'grid',
        className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',
        children: Array.from({ length: 4 }).map((_, i) => ({
          id: `stat-card-${i}`,
          type: 'card',
          className: 'bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-5 space-y-3',
          children: [
            { id: `s-top-${i}`, type: 'box', className: 'flex justify-between items-center', children: [
              { id: `s-lbl-${i}`, type: 'text', width: 'w-24', height: 'h-4', className: 'bg-zinc-800 rounded' },
              { id: `s-ico-${i}`, type: 'circle', width: 'w-8', height: 'h-8', className: 'bg-zinc-800 rounded-full' }
            ]},
            { id: `s-val-${i}`, type: 'text', width: 'w-16', height: 'h-8', className: 'bg-zinc-800/90 rounded-md' }
          ]
        }))
      },
      // Main Body: Chart & Checklist section
      {
        id: 'main-content',
        type: 'grid',
        className: 'grid grid-cols-1 lg:grid-cols-3 gap-6',
        children: [
          {
            id: 'chart-box',
            type: 'card',
            className: 'lg:col-span-2 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 h-80 flex flex-col justify-between',
            children: [
              { id: 'c-title', type: 'text', width: 'w-40', height: 'h-6', className: 'bg-zinc-800 rounded' },
              { id: 'c-graphic', type: 'box', width: 'w-full', height: 'h-56', className: 'bg-zinc-800/40 rounded-xl' }
            ]
          },
          {
            id: 'side-box',
            type: 'card',
            className: 'bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 h-80 space-y-4',
            children: [
              { id: 'side-title', type: 'text', width: 'w-32', height: 'h-6', className: 'bg-zinc-800 rounded' },
              { id: 'side-item-1', type: 'box', height: 'h-16', className: 'bg-zinc-800/50 rounded-xl' },
              { id: 'side-item-2', type: 'box', height: 'h-16', className: 'bg-zinc-800/50 rounded-xl' },
              { id: 'side-item-3', type: 'box', height: 'h-16', className: 'bg-zinc-800/50 rounded-xl' }
            ]
          }
        ]
      }
    ];

    return new SkeletonSchema('dashboard', nodes);
  }
}

/**
 * Concrete Builder: Card Grid Skeleton (for Market, Leaderboard, Worker List)
 */
export class CardGridSkeletonBuilder extends BaseSkeletonBuilder {
  public buildSchema(): SkeletonSchema {
    const count = this.options.count || 6;
    const cols = this.options.gridCols || 3;

    const gridColsClass = 
      cols === 2 ? 'grid-cols-1 md:grid-cols-2' :
      cols === 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' :
      'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

    const nodes: SkeletonNode[] = [
      {
        id: 'card-grid-container',
        type: 'grid',
        className: `grid ${gridColsClass} gap-4`,
        children: Array.from({ length: count }).map((_, i) => ({
          id: `card-${i}`,
          type: 'card',
          className: 'bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-5 space-y-4',
          children: [
            { id: `c-header-${i}`, type: 'box', className: 'flex items-center gap-3', children: [
              { id: `c-avatar-${i}`, type: 'circle', width: 'w-12', height: 'h-12', className: 'bg-zinc-800 rounded-full shrink-0' },
              { id: `c-meta-${i}`, type: 'box', className: 'space-y-2 flex-1', children: [
                { id: `c-t-${i}`, type: 'text', width: 'w-3/4', height: 'h-4', className: 'bg-zinc-800 rounded' },
                { id: `c-s-${i}`, type: 'text', width: 'w-1/2', height: 'h-3', className: 'bg-zinc-800/60 rounded' }
              ]}
            ]},
            { id: `c-body-${i}`, type: 'box', height: 'h-12', className: 'bg-zinc-800/30 rounded-xl' },
            { id: `c-btn-${i}`, type: 'box', height: 'h-10', className: 'bg-zinc-800 rounded-xl' }
          ]
        }))
      }
    ];

    return new SkeletonSchema('card-grid', nodes);
  }
}

/**
 * Concrete Builder: Table Skeleton (for Audit & Admin Console)
 */
export class TableSkeletonBuilder extends BaseSkeletonBuilder {
  public buildSchema(): SkeletonSchema {
    const rows = this.options.rows || 5;

    const nodes: SkeletonNode[] = [
      {
        id: 'table-container',
        type: 'card',
        className: 'bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 space-y-3',
        children: [
          // Search & Filter header skeleton
          { id: 't-toolbar', type: 'box', className: 'flex justify-between items-center mb-4', children: [
            { id: 't-search', type: 'box', width: 'w-64', height: 'h-10', className: 'bg-zinc-800 rounded-xl' },
            { id: 't-filter', type: 'box', width: 'w-32', height: 'h-10', className: 'bg-zinc-800 rounded-xl' }
          ]},
          // Table rows skeleton
          {
            id: 't-rows',
            type: 'box',
            className: 'space-y-2',
            children: Array.from({ length: rows }).map((_, i) => ({
              id: `row-${i}`,
              type: 'table-row',
              height: 'h-14',
              className: 'bg-zinc-800/40 border border-zinc-800/60 rounded-xl flex items-center px-4 justify-between',
              children: [
                { id: `r-cell1-${i}`, type: 'text', width: 'w-1/4', height: 'h-4', className: 'bg-zinc-700/60 rounded' },
                { id: `r-cell2-${i}`, type: 'text', width: 'w-1/6', height: 'h-4', className: 'bg-zinc-700/60 rounded' },
                { id: `r-cell3-${i}`, type: 'text', width: 'w-1/5', height: 'h-4', className: 'bg-zinc-700/60 rounded' },
                { id: `r-cell4-${i}`, type: 'box', width: 'w-20', height: 'h-8', className: 'bg-zinc-700 rounded-lg' }
              ]
            }))
          }
        ]
      }
    ];

    return new SkeletonSchema('table', nodes);
  }
}

/**
 * Concrete Builder: Modal Skeleton (for Dialogs & Forms)
 */
export class ModalSkeletonBuilder extends BaseSkeletonBuilder {
  public buildSchema(): SkeletonSchema {
    const nodes: SkeletonNode[] = [
      {
        id: 'modal-card',
        type: 'card',
        className: 'bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-lg w-full space-y-6 mx-auto',
        children: [
          { id: 'm-head', type: 'box', className: 'flex justify-between items-center', children: [
            { id: 'm-title', type: 'text', width: 'w-1/2', height: 'h-6', className: 'bg-zinc-800 rounded' },
            { id: 'm-close', type: 'circle', width: 'w-6', height: 'h-6', className: 'bg-zinc-800 rounded-full' }
          ]},
          { id: 'm-field1', type: 'box', height: 'h-12', className: 'bg-zinc-800/50 rounded-xl' },
          { id: 'm-field2', type: 'box', height: 'h-12', className: 'bg-zinc-800/50 rounded-xl' },
          { id: 'm-btn', type: 'box', height: 'h-11', className: 'bg-zinc-800 rounded-xl' }
        ]
      }
    ];

    return new SkeletonSchema('modal', nodes);
  }
}

/**
 * OOP LazySkeletonEngine Factory & Registry
 */
export class LazySkeletonEngine {
  private static instance: LazySkeletonEngine;

  private constructor() {}

  public static getInstance(): LazySkeletonEngine {
    if (!LazySkeletonEngine.instance) {
      LazySkeletonEngine.instance = new LazySkeletonEngine();
    }
    return LazySkeletonEngine.instance;
  }

  /**
   * Factory method to create appropriate skeleton schema using OOP Builders
   */
  public getSkeletonSchema(type: SkeletonType, options: SkeletonOptions = {}): SkeletonSchema {
    let builder: BaseSkeletonBuilder;

    switch (type) {
      case 'dashboard':
        builder = new DashboardSkeletonBuilder(options);
        break;
      case 'card-grid':
      case 'leaderboard':
        builder = new CardGridSkeletonBuilder(options);
        break;
      case 'table':
        builder = new TableSkeletonBuilder(options);
        break;
      case 'modal':
      case 'profile':
        builder = new ModalSkeletonBuilder(options);
        break;
      case 'chart':
        builder = new DashboardSkeletonBuilder(options);
        break;
      default:
        builder = new DashboardSkeletonBuilder(options);
    }

    return builder.buildSchema();
  }
}
