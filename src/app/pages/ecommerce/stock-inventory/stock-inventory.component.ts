import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject, interval, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';

// ===============================
// INTERFACES ET TYPES
// ===============================

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: string[];
  timestamp: string;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface StockDTO {
  id: number;
  articleId: number;
  quantiteActuelle: number;
  quantiteReservee: number;
  quantiteDisponible: number;
  prixMoyenPondere: number;
  valeurStock: number;
  derniereEntree?: string;
  derniereSortie?: string;
  dateDernierInventaire?: string;
  quantiteInventaire?: number;
  ecartInventaire?: number;
  dateModification: string;

  // Informations article enrichies - Updated to match API
  articleNom: string;
  articleDesignation?: string;
  articleCategorie?: string;
  articleUnite?: string;
  articleStockMin?: number;
  articleStockMax?: number;

  // Statuts calculés - From API
  stockFaible: boolean;
  stockCritique: boolean;
  stockExcessif: boolean;
  statutStock: 'NORMAL' | 'FAIBLE' | 'CRITIQUE' | 'EXCESSIF';
  stockStatusColor: string;
  rotationRate: number;
}

export interface SearchCriteriaDTO {
  query?: string;
  categorie?: string;
  fournisseurId?: number;
  actif?: boolean;
  stockFaible?: boolean;
  stockCritique?: boolean;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}

export interface StockAlerts {
  critical: StockDTO[];
  low: StockDTO[];
  empty: StockDTO[];
}

export interface StockStatistics {
  totalStocks: number;
  totalValue: number;
  criticalCount: number;
  lowCount: number;
  emptyCount: number;
  normalCount: number;
}

export interface FilterState {
  searchTerm: string;
  selectedCategory: string;
  showCriticalOnly: boolean;
  showLowOnly: boolean;
  showEmptyOnly: boolean;
}

export interface PaginationState {
  page: number;
  size: number;
  sortBy: string;
  sortDirection: 'ASC' | 'DESC';
}

// ===============================
// SERVICE STOCK API
// ===============================

export class StockApiService {
  constructor(private http: HttpClient, private baseUrl: string = '/api/stocks') {
    console.log('StockApiService initialized with baseUrl:', this.baseUrl);
  }

  getAllStocks(params: PaginationState): Observable<ApiResponse<PagedResponse<StockDTO>>> {
    let httpParams = new HttpParams()
      .set('page', params.page.toString())
      .set('size', params.size.toString())
      .set('sortBy', params.sortBy)
      .set('sortDirection', params.sortDirection);

    console.log('Making API call to:', `${this.baseUrl}`, 'with params:', httpParams.toString());

    return this.http.get<ApiResponse<PagedResponse<StockDTO>>>(`${this.baseUrl}`, { params: httpParams })
      .pipe(
        tap(response => console.log('API Response received:', response)),
        catchError(error => {
          console.error('API Error in getAllStocks:', error);
          throw error;
        })
      );
  }

  searchStocks(criteria: SearchCriteriaDTO): Observable<ApiResponse<PagedResponse<StockDTO>>> {
    console.log('Searching stocks with criteria:', criteria);
    return this.http.post<ApiResponse<PagedResponse<StockDTO>>>(`${this.baseUrl}/search`, criteria)
      .pipe(
        tap(response => console.log('Search response:', response)),
        catchError(error => {
          console.error('Search error:', error);
          throw error;
        })
      );
  }

  searchStocksByText(query: string, page: number, size: number): Observable<ApiResponse<PagedResponse<StockDTO>>> {
    let httpParams = new HttpParams()
      .set('q', query)
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<ApiResponse<PagedResponse<StockDTO>>>(`${this.baseUrl}/search`, { params: httpParams })
      .pipe(
        catchError(error => {
          console.error('Text search error:', error);
          throw error;
        })
      );
  }

  getCriticalStocks(): Observable<ApiResponse<StockDTO[]>> {
    return this.http.get<ApiResponse<StockDTO[]>>(`${this.baseUrl}/alerts/critical`)
      .pipe(
        catchError(error => {
          console.error('Critical stocks error:', error);
          return of({ success: false, data: [], message: error.message } as any);
        })
      );
  }

  getLowStocks(): Observable<ApiResponse<StockDTO[]>> {
    return this.http.get<ApiResponse<StockDTO[]>>(`${this.baseUrl}/alerts/low`)
      .pipe(
        catchError(error => {
          console.error('Low stocks error:', error);
          return of({ success: false, data: [], message: error.message } as any);
        })
      );
  }

  getEmptyStocks(): Observable<ApiResponse<StockDTO[]>> {
    return this.http.get<ApiResponse<StockDTO[]>>(`${this.baseUrl}/alerts/empty`)
      .pipe(
        catchError(error => {
          console.error('Empty stocks error:', error);
          return of({ success: false, data: [], message: error.message } as any);
        })
      );
  }

  getStocksByCategory(category: string): Observable<ApiResponse<StockDTO[]>> {
    return this.http.get<ApiResponse<StockDTO[]>>(`${this.baseUrl}/filter/category/${encodeURIComponent(category)}`)
      .pipe(
        catchError(error => {
          console.error('Category filter error:', error);
          throw error;
        })
      );
  }

  getStocksBySupplier(supplierId: number): Observable<ApiResponse<StockDTO[]>> {
    return this.http.get<ApiResponse<StockDTO[]>>(`${this.baseUrl}/filter/supplier/${supplierId}`)
      .pipe(
        catchError(error => {
          console.error('Supplier filter error:', error);
          throw error;
        })
      );
  }

  getInconsistentStocks(): Observable<ApiResponse<StockDTO[]>> {
    return this.http.get<ApiResponse<StockDTO[]>>(`${this.baseUrl}/maintenance/inconsistent`)
      .pipe(
        catchError(error => {
          console.error('Inconsistent stocks error:', error);
          throw error;
        })
      );
  }
}

// ===============================
// COMPOSANT PRINCIPAL
// ===============================

@Component({
  selector: 'app-stock-inventory',
  templateUrl: './stock-inventory.component.html',
  styleUrls: ['./stock-inventory.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StockInventoryComponent implements OnInit, OnDestroy {

  // ===============================
  // INPUTS ET OUTPUTS
  // ===============================

  @Input() apiBaseUrl: string = 'http://localhost:8090/api/stocks';
  @Input() autoRefreshInterval: number = 30000;
  @Input() enableAutoRefresh: boolean = true;
  @Input() pageSize: number = 10;
  @Input() showAdvancedFilters: boolean = true;
  @Input() enableExport: boolean = true;
  @Input() enableBulkActions: boolean = true;

  @Output() stockSelected = new EventEmitter<StockDTO>();
  @Output() stockEdit = new EventEmitter<number>();
  @Output() stockView = new EventEmitter<StockDTO>();
  @Output() bulkAction = new EventEmitter<{action: string, stocks: StockDTO[]}>();

  // ===============================
  // PROPRIÉTÉS PUBLIQUES
  // ===============================

  // État des données
  stocks: StockDTO[] = [];
  totalElements: number = 0;
  totalPages: number = 0;
  loading: boolean = false;
  error: string | null = null;
  lastUpdate: Date | null = null;

  // Alertes et statistiques
  alerts: StockAlerts = { critical: [], low: [], empty: [] };
  statistics: StockStatistics = {
    totalStocks: 0,
    totalValue: 0,
    criticalCount: 0,
    lowCount: 0,
    emptyCount: 0,
    normalCount: 0
  };

  // État de l'interface
  view: 'table' | 'cards' | 'grid' = 'table';
  selectedStocks: Set<number> = new Set();
  expandedRows: Set<number> = new Set();
  showFilters: boolean = false;
  showStatistics: boolean = true;

  // Configuration
  viewModes = [
    { value: 'table', label: 'Tableau', icon: 'bx bx-table' },
    { value: 'cards', label: 'Cartes', icon: 'bx bx-grid-alt' },
    { value: 'grid', label: 'Grille', icon: 'bx bx-grid' }
  ];

  sortableColumns = [
    { key: 'articleNom', label: 'Nom Article' },
    { key: 'quantiteActuelle', label: 'Quantité' },
    { key: 'valeurStock', label: 'Valeur' },
    { key: 'dateModification', label: 'Dernière MAJ' }
  ];

  pageSizeOptions = [5, 10, 20, 50];

  // ===============================
  // SUJETS RXJS PRIVÉS
  // ===============================

  private destroy$ = new Subject<void>();
  private refresh$ = new BehaviorSubject<void>(undefined);
  private searchTerms$ = new BehaviorSubject<string>('');
  private filterState$ = new BehaviorSubject<FilterState>({
    searchTerm: '',
    selectedCategory: '',
    showCriticalOnly: false,
    showLowOnly: false,
    showEmptyOnly: false
  });
  private paginationState$ = new BehaviorSubject<PaginationState>({
    page: 0,
    size: this.pageSize,
    sortBy: 'articleNom',
    sortDirection: 'ASC'
  });

  // ===============================
  // PROPRIÉTÉS PRIVÉES
  // ===============================

  private apiService: StockApiService;

  // ===============================
  // GETTERS PUBLICS
  // ===============================

  get hasSelection(): boolean {
    return this.selectedStocks.size > 0;
  }

  get categories(): string[] {
    const cats = [...new Set(this.stocks.map(s => s.articleCategorie).filter(Boolean))];
    return cats.sort();
  }

  get currentFilterState(): FilterState {
    return this.filterState$.value;
  }

  get currentPaginationState(): PaginationState {
    return this.paginationState$.value;
  }

  get isFirstPage(): boolean {
    return this.currentPaginationState.page === 0;
  }

  get isLastPage(): boolean {
    return this.currentPaginationState.page >= this.totalPages - 1;
  }

  get paginationInfo(): string {
    const { page, size } = this.currentPaginationState;
    const start = page * size + 1;
    const end = Math.min((page + 1) * size, this.totalElements);
    return `${start}-${end} sur ${this.totalElements}`;
  }

  get paginationPages(): number[] {
    const pages = [];
    const currentPage = this.currentPaginationState.page;
    const totalPages = this.totalPages;

    const startPage = Math.max(0, currentPage - 2);
    const endPage = Math.min(totalPages - 1, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  // ===============================
  // CYCLE DE VIE ANGULAR
  // ===============================

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {
    console.log('StockInventoryComponent constructor called');
  }

  ngOnInit(): void {
    console.log('StockInventoryComponent ngOnInit');
    this.initializeComponent();
    this.setupDataStreams();
    this.setupAutoRefresh();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===============================
  // MÉTHODES D'INITIALISATION
  // ===============================

  private initializeComponent(): void {
    console.log('Initializing component with baseUrl:', this.apiBaseUrl);
    this.apiService = new StockApiService(this.http, this.apiBaseUrl);
    this.paginationState$.next({
      ...this.paginationState$.value,
      size: this.pageSize
    });
  }

  private setupDataStreams(): void {
    console.log('Setting up data streams');

    const dataStream$ = combineLatest([
      this.paginationState$,
      this.filterState$,
      this.refresh$
    ]).pipe(
      debounceTime(100),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      tap(() => {
        console.log('Loading data...');
        this.loading = true;
        this.cdr.markForCheck();
      }),
      switchMap(([pagination, filters]) => this.loadStockData(pagination, filters)),
      takeUntil(this.destroy$)
    );

    dataStream$.subscribe({
      next: (response) => {
        console.log('Data stream response:', response);
        this.handleDataResponse(response);
      },
      error: (error) => {
        console.error('Data stream error:', error);
        this.handleError(error);
      }
    });

    this.searchTerms$.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => {
      this.updateFilterState({ searchTerm: term });
    });
  }

  private setupAutoRefresh(): void {
    if (this.enableAutoRefresh && this.autoRefreshInterval > 0) {
      interval(this.autoRefreshInterval)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          console.log('Auto-refreshing data');
          this.refreshData();
          this.loadAlerts();
        });
    }
  }

  private loadInitialData(): void {
    console.log('Loading initial data');
    this.loadAlerts();
    this.refresh$.next();
  }

  // ===============================
  // MÉTHODES DE CHARGEMENT DE DONNÉES
  // ===============================

  private loadStockData(pagination: PaginationState, filters: FilterState): Observable<ApiResponse<PagedResponse<StockDTO>> | ApiResponse<StockDTO[]>> {
    console.log('Loading stock data with:', { pagination, filters });

    if (filters.searchTerm.trim()) {
      return this.apiService.searchStocksByText(filters.searchTerm, pagination.page, pagination.size);
    }

    if (filters.showCriticalOnly) {
      return this.apiService.getCriticalStocks();
    }

    if (filters.showLowOnly) {
      return this.apiService.getLowStocks();
    }

    if (filters.showEmptyOnly) {
      return this.apiService.getEmptyStocks();
    }

    if (filters.selectedCategory) {
      return this.apiService.getStocksByCategory(filters.selectedCategory);
    }

    return this.apiService.getAllStocks(pagination);
  }

  private handleDataResponse(response: ApiResponse<PagedResponse<StockDTO>> | ApiResponse<StockDTO[]>): void {
    console.log('Handling data response:', response);

    this.loading = false;
    this.error = null;
    this.lastUpdate = new Date();

    if (response && response.success) {
      if (response.data && 'content' in response.data) {
        const pagedData = response.data as PagedResponse<StockDTO>;
        this.stocks = pagedData.content || [];
        this.totalElements = pagedData.totalElements || 0;
        this.totalPages = pagedData.totalPages || 1;
        console.log('Loaded paginated data:', {
          stocks: this.stocks.length,
          totalElements: this.totalElements,
          totalPages: this.totalPages
        });
      } else {
        const arrayData = (response.data as StockDTO[]) || [];
        this.stocks = arrayData;
        this.totalElements = arrayData.length;
        this.totalPages = 1;
        console.log('Loaded array data:', { stocks: this.stocks.length });
      }
      this.calculateStatistics();
    } else {
      this.error = response?.message || 'Erreur lors du chargement des données';
      this.stocks = [];
      this.totalElements = 0;
      this.totalPages = 0;
      console.error('Data response error:', this.error);
    }

    this.cdr.markForCheck();
  }

  private loadAlerts(): void {
    console.log('Loading alerts');

    const alertsStreams$ = combineLatest([
      this.apiService.getCriticalStocks().pipe(catchError(() => of({ success: false, data: [] } as any))),
      this.apiService.getLowStocks().pipe(catchError(() => of({ success: false, data: [] } as any))),
      this.apiService.getEmptyStocks().pipe(catchError(() => of({ success: false, data: [] } as any)))
    ]).pipe(takeUntil(this.destroy$));

    alertsStreams$.subscribe(([critical, low, empty]) => {
      this.alerts = {
        critical: critical.success ? critical.data : [],
        low: low.success ? low.data : [],
        empty: empty.success ? empty.data : []
      };
      this.calculateStatistics();
      this.cdr.markForCheck();
    });
  }

  private calculateStatistics(): void {
    this.statistics = {
      totalStocks: this.totalElements,
      totalValue: this.stocks.reduce((sum, stock) => sum + (stock.valeurStock || 0), 0),
      criticalCount: this.stocks.filter(s => s.stockCritique).length,
      lowCount: this.stocks.filter(s => s.stockFaible).length,
      emptyCount: this.stocks.filter(s => s.quantiteActuelle === 0).length,
      normalCount: this.stocks.filter(s => s.statutStock === 'NORMAL').length
    };
    console.log('Updated statistics:', this.statistics);
  }

  private handleError(error: any): void {
    this.loading = false;
    this.error = error.message || 'Une erreur est survenue lors du chargement des données';
    console.error('StockInventory Error:', error);

    // Show user-friendly error messages
    if (error.status === 0) {
      this.error = 'Impossible de se connecter au serveur. Vérifiez votre connexion.';
    } else if (error.status === 404) {
      this.error = 'Service non trouvé. Vérifiez l\'URL de l\'API.';
    } else if (error.status === 500) {
      this.error = 'Erreur interne du serveur.';
    }

    this.cdr.markForCheck();
  }

  // ===============================
  // MÉTHODES PUBLIQUES - NAVIGATION
  // ===============================

  onPageChange(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      console.log('Changing to page:', page);
      this.updatePaginationState({ page });
    }
  }

  onPageSizeChange(size: number): void {
    console.log('Changing page size to:', size);
    this.updatePaginationState({ page: 0, size });
  }

  onSort(column: string): void {
    const currentState = this.currentPaginationState;
    const direction = currentState.sortBy === column && currentState.sortDirection === 'ASC' ? 'DESC' : 'ASC';
    console.log('Sorting by:', column, direction);

    this.updatePaginationState({
      page: 0,
      sortBy: column,
      sortDirection: direction
    });
  }

  // ===============================
  // MÉTHODES PUBLIQUES - FILTRES
  // ===============================

  onSearchChange(term: string): void {
    console.log('Search term changed:', term);
    this.searchTerms$.next(term);
  }

  onCategoryFilter(category: string): void {
    console.log('Category filter:', category);
    this.updateFilterState({
      selectedCategory: category,
      showCriticalOnly: false,
      showLowOnly: false,
      showEmptyOnly: false
    });
  }

  onCriticalFilter(): void {
    console.log('Critical filter toggled');
    this.updateFilterState({
      showCriticalOnly: !this.currentFilterState.showCriticalOnly,
      showLowOnly: false,
      showEmptyOnly: false,
      selectedCategory: ''
    });
  }

  onLowStockFilter(): void {
    console.log('Low stock filter toggled');
    this.updateFilterState({
      showLowOnly: !this.currentFilterState.showLowOnly,
      showCriticalOnly: false,
      showEmptyOnly: false,
      selectedCategory: ''
    });
  }

  onEmptyStockFilter(): void {
    console.log('Empty stock filter toggled');
    this.updateFilterState({
      showEmptyOnly: !this.currentFilterState.showEmptyOnly,
      showCriticalOnly: false,
      showLowOnly: false,
      selectedCategory: ''
    });
  }

  onResetFilters(): void {
    console.log('Resetting filters');
    this.searchTerms$.next('');
    this.updateFilterState({
      searchTerm: '',
      selectedCategory: '',
      showCriticalOnly: false,
      showLowOnly: false,
      showEmptyOnly: false
    });
    this.updatePaginationState({ page: 0 });
  }

  // ===============================
  // MÉTHODES PUBLIQUES - ACTIONS
  // ===============================

  onStockSelect(stock: StockDTO): void {
    console.log('Stock selected:', stock);
    this.stockSelected.emit(stock);
  }

  onStockEdit(stockId: number): void {
    console.log('Edit stock:', stockId);
    this.stockEdit.emit(stockId);
  }

  onStockView(stock: StockDTO): void {
    console.log('View stock:', stock);
    this.stockView.emit(stock);
  }

  onToggleRowSelection(stockId: number): void {
    if (this.selectedStocks.has(stockId)) {
      this.selectedStocks.delete(stockId);
    } else {
      this.selectedStocks.add(stockId);
    }
    console.log('Selected stocks:', Array.from(this.selectedStocks));
  }

  onSelectAllRows(): void {
    if (this.selectedStocks.size === this.stocks.length) {
      this.selectedStocks.clear();
    } else {
      this.selectedStocks.clear();
      this.stocks.forEach(stock => this.selectedStocks.add(stock.id));
    }
    console.log('Select all toggled. Selected:', Array.from(this.selectedStocks));
  }

  onToggleExpandRow(stockId: number): void {
    if (this.expandedRows.has(stockId)) {
      this.expandedRows.delete(stockId);
    } else {
      this.expandedRows.add(stockId);
    }
  }

  onViewChange(newView: 'table' | 'cards' | 'grid'): void {
    console.log('View changed to:', newView);
    this.view = newView;
  }

  onRefresh(): void {
    console.log('Manual refresh triggered');
    this.refreshData();
    this.loadAlerts();
  }

  onExport(): void {
    console.log('Export requested');
    // TODO: Implement export functionality
  }

  onBulkAction(action: string): void {
    const selectedStockData = this.stocks.filter(stock => this.selectedStocks.has(stock.id));
    console.log('Bulk action:', action, selectedStockData);
    this.bulkAction.emit({ action, stocks: selectedStockData });
  }

  onToggleStatistics(): void {
    this.showStatistics = !this.showStatistics;
  }

  onToggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  // ===============================
  // MÉTHODES UTILITAIRES
  // ===============================

  refreshData(): void {
    this.refresh$.next();
  }

  getSortDirection(column: string): 'asc' | 'desc' | '' {
    const current = this.currentPaginationState;
    if (current.sortBy === column) {
      return current.sortDirection.toLowerCase() as 'asc' | 'desc';
    }
    return '';
  }

  getStockStatusClass(stock: StockDTO): string {
    switch (stock.statutStock) {
      case 'CRITIQUE': return 'status-critical';
      case 'FAIBLE': return 'status-low';
      case 'EXCESSIF': return 'status-excessive';
      default: return 'status-normal';
    }
  }

  getStockStatusIcon(stock: StockDTO): string {
    switch (stock.statutStock) {
      case 'CRITIQUE': return 'bx bx-error';
      case 'FAIBLE': return 'bx bx-error-alt';
      case 'EXCESSIF': return 'bx bx-info-circle';
      default: return 'bx bx-check-circle';
    }
  }

  getStockStatusBadgeClass(stock: StockDTO): string {
    switch (stock.statutStock) {
      case 'CRITIQUE': return 'badge-danger';
      case 'FAIBLE': return 'badge-warning';
      case 'EXCESSIF': return 'badge-info';
      default: return 'badge-success';
    }
  }

  getDisplayName(stock: StockDTO): string {
    return stock.articleNom || stock.articleDesignation || `Article ${stock.articleId}`;
  }

  getArticleCode(stock: StockDTO): string {
    return `ART-${stock.articleId}`;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD'
    }).format(value || 0);
  }

  formatDate(date: string | Date): string {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  trackByStockId(index: number, stock: StockDTO): number {
    return stock.id;
  }

  // ===============================
  // MÉTHODES PRIVÉES - ÉTAT
  // ===============================

  private updateFilterState(partial: Partial<FilterState>): void {
    const current = this.filterState$.value;
    this.filterState$.next({ ...current, ...partial });
  }

  private updatePaginationState(partial: Partial<PaginationState>): void {
    const current = this.paginationState$.value;
    this.paginationState$.next({ ...current, ...partial });
  }

  // ===============================
  // MÉTHODES DE DEBUG
  // ===============================

  debugApiCall(): void {
    console.log('=== DEBUG INFO ===');
    console.log('API Base URL:', this.apiBaseUrl);
    console.log('Current pagination state:', this.currentPaginationState);
    console.log('Current filter state:', this.currentFilterState);
    console.log('Stocks count:', this.stocks.length);
    console.log('Total elements:', this.totalElements);
    console.log('================');
  }
}