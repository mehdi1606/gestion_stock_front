import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject, interval, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, catchError, tap, startWith } from 'rxjs/operators';
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

  // Informations article enrichies
  articleCode: string;
  articleDesignation: string;
  articleCategorie?: string;
  articleUnite?: string;
  articleStockMin?: number;
  articleStockMax?: number;

  // Statuts calculés
  stockFaible: boolean;
  stockCritique: boolean;
  stockExcessif: boolean;
  statutStock: 'NORMAL' | 'FAIBLE' | 'CRITIQUE' | 'EXCESSIF';
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
  constructor(private http: HttpClient, private baseUrl: string = 'http://localhost:8090/api/stocks') {}

  getAllStocks(params: PaginationState): Observable<ApiResponse<PagedResponse<StockDTO>>> {
    let httpParams = new HttpParams()
      .set('page', params.page.toString())
      .set('size', params.size.toString())
      .set('sortBy', params.sortBy)
      .set('sortDirection', params.sortDirection);

    return this.http.get<ApiResponse<PagedResponse<StockDTO>>>(`${this.baseUrl}`, { params: httpParams });
  }

  searchStocks(criteria: SearchCriteriaDTO): Observable<ApiResponse<PagedResponse<StockDTO>>> {
    return this.http.post<ApiResponse<PagedResponse<StockDTO>>>(`${this.baseUrl}/search`, criteria);
  }

  searchStocksByText(query: string, page: number, size: number): Observable<ApiResponse<PagedResponse<StockDTO>>> {
    let httpParams = new HttpParams()
      .set('q', query)
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<ApiResponse<PagedResponse<StockDTO>>>(`${this.baseUrl}/search`, { params: httpParams });
  }

  getCriticalStocks(): Observable<ApiResponse<StockDTO[]>> {
    return this.http.get<ApiResponse<StockDTO[]>>(`${this.baseUrl}/alerts/critical`);
  }

  getLowStocks(): Observable<ApiResponse<StockDTO[]>> {
    return this.http.get<ApiResponse<StockDTO[]>>(`${this.baseUrl}/alerts/low`);
  }

  getEmptyStocks(): Observable<ApiResponse<StockDTO[]>> {
    return this.http.get<ApiResponse<StockDTO[]>>(`${this.baseUrl}/alerts/empty`);
  }

  getStocksByCategory(category: string): Observable<ApiResponse<StockDTO[]>> {
    return this.http.get<ApiResponse<StockDTO[]>>(`${this.baseUrl}/filter/category/${encodeURIComponent(category)}`);
  }

  getStocksBySupplier(supplierId: number): Observable<ApiResponse<StockDTO[]>> {
    return this.http.get<ApiResponse<StockDTO[]>>(`${this.baseUrl}/filter/supplier/${supplierId}`);
  }

  getInconsistentStocks(): Observable<ApiResponse<StockDTO[]>> {
    return this.http.get<ApiResponse<StockDTO[]>>(`${this.baseUrl}/maintenance/inconsistent`);
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
  @Input() autoRefreshInterval: number = 30000; // 30 secondes
  @Input() enableAutoRefresh: boolean = true;
  @Input() pageSize: number = 20;
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
    { key: 'articleCode', label: 'Code Article' },
    { key: 'articleDesignation', label: 'Désignation' },
    { key: 'quantiteActuelle', label: 'Quantité' },
    { key: 'valeurStock', label: 'Valeur' },
    { key: 'dateModification', label: 'Dernière MAJ' }
  ];

  // Pagination
  pageSizeOptions = [10, 20, 50, 100];

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
    sortBy: 'articleDesignation',
    sortDirection: 'ASC'
  });

  // ===============================
  // PROPRIÉTÉS PRIVÉES
  // ===============================

  private apiService: StockApiService;
  private autoRefreshSubscription: any;

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

    // Logique de pagination avec ellipses
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
    this.apiService = new StockApiService(this.http, this.apiBaseUrl);
  }

  ngOnInit(): void {
    this.initializeComponent();
    this.setupDataStreams();
    this.setupAutoRefresh();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.autoRefreshSubscription) {
      this.autoRefreshSubscription.unsubscribe();
    }
  }

  // ===============================
  // MÉTHODES D'INITIALISATION
  // ===============================

  private initializeComponent(): void {
    this.apiService = new StockApiService(this.http, this.apiBaseUrl);
    this.paginationState$.next({
      ...this.paginationState$.value,
      size: this.pageSize
    });
  }

  private setupDataStreams(): void {
    // Stream principal pour les données
    const dataStream$ = combineLatest([
      this.paginationState$,
      this.filterState$,
      this.refresh$
    ]).pipe(
      debounceTime(100),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      tap(() => this.loading = true),
      switchMap(([pagination, filters]) => this.loadStockData(pagination, filters)),
      takeUntil(this.destroy$)
    );

    dataStream$.subscribe({
      next: (response) => this.handleDataResponse(response),
      error: (error) => this.handleError(error)
    });

    // Stream pour la recherche textuelle
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
      this.autoRefreshSubscription = interval(this.autoRefreshInterval)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.refreshData();
          this.loadAlerts();
        });
    }
  }

  private loadInitialData(): void {
    this.loadAlerts();
    this.refresh$.next();
  }

  // ===============================
  // MÉTHODES DE CHARGEMENT DE DONNÉES
  // ===============================

  private loadStockData(pagination: PaginationState, filters: FilterState): Observable<ApiResponse<PagedResponse<StockDTO>> | ApiResponse<StockDTO[]>> {
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
    this.loading = false;
    this.error = null;
    this.lastUpdate = new Date();

    if (response.success) {
      if ('content' in response.data) {
        // Réponse paginée
        const pagedData = response.data as PagedResponse<StockDTO>;
        this.stocks = pagedData.content;
        this.totalElements = pagedData.totalElements;
        this.totalPages = pagedData.totalPages;
      } else {
        // Réponse simple (array)
        const arrayData = response.data as StockDTO[];
        this.stocks = arrayData;
        this.totalElements = arrayData.length;
        this.totalPages = 1;
      }
      this.calculateStatistics();
    } else {
      this.error = response.message || 'Erreur lors du chargement des données';
    }

    this.cdr.markForCheck();
  }

  private loadAlerts(): void {
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
      totalValue: this.stocks.reduce((sum, stock) => sum + stock.valeurStock, 0),
      criticalCount: this.alerts.critical.length,
      lowCount: this.alerts.low.length,
      emptyCount: this.alerts.empty.length,
      normalCount: this.totalElements - this.alerts.critical.length - this.alerts.low.length - this.alerts.empty.length
    };
  }

  private handleError(error: any): void {
    this.loading = false;
    this.error = error.message || 'Une erreur est survenue';
    console.error('Erreur StockInventory:', error);
    this.cdr.markForCheck();
  }

  // ===============================
  // MÉTHODES PUBLIQUES - NAVIGATION
  // ===============================

  onPageChange(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.updatePaginationState({ page });
    }
  }

  onPageSizeChange(size: number): void {
    this.updatePaginationState({ page: 0, size });
  }

  onSort(column: string): void {
    const currentState = this.currentPaginationState;
    const direction = currentState.sortBy === column && currentState.sortDirection === 'ASC' ? 'DESC' : 'ASC';

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
    this.searchTerms$.next(term);
  }

  onCategoryFilter(category: string): void {
    this.updateFilterState({
      selectedCategory: category,
      showCriticalOnly: false,
      showLowOnly: false,
      showEmptyOnly: false
    });
  }

  onCriticalFilter(): void {
    this.updateFilterState({
      showCriticalOnly: !this.currentFilterState.showCriticalOnly,
      showLowOnly: false,
      showEmptyOnly: false,
      selectedCategory: ''
    });
  }

  onLowStockFilter(): void {
    this.updateFilterState({
      showLowOnly: !this.currentFilterState.showLowOnly,
      showCriticalOnly: false,
      showEmptyOnly: false,
      selectedCategory: ''
    });
  }

  onEmptyStockFilter(): void {
    this.updateFilterState({
      showEmptyOnly: !this.currentFilterState.showEmptyOnly,
      showCriticalOnly: false,
      showLowOnly: false,
      selectedCategory: ''
    });
  }

  onResetFilters(): void {
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
    this.stockSelected.emit(stock);
  }

  onStockEdit(stockId: number): void {
    this.stockEdit.emit(stockId);
  }

  onStockView(stock: StockDTO): void {
    this.stockView.emit(stock);
  }

  onToggleRowSelection(stockId: number): void {
    if (this.selectedStocks.has(stockId)) {
      this.selectedStocks.delete(stockId);
    } else {
      this.selectedStocks.add(stockId);
    }
  }

  onSelectAllRows(): void {
    if (this.selectedStocks.size === this.stocks.length) {
      this.selectedStocks.clear();
    } else {
      this.selectedStocks.clear();
      this.stocks.forEach(stock => this.selectedStocks.add(stock.id));
    }
  }

  onToggleExpandRow(stockId: number): void {
    if (this.expandedRows.has(stockId)) {
      this.expandedRows.delete(stockId);
    } else {
      this.expandedRows.add(stockId);
    }
  }

  onViewChange(newView: 'table' | 'cards' | 'grid'): void {
    this.view = newView;
  }

  onRefresh(): void {
    this.refreshData();
    this.loadAlerts();
  }

  onExport(): void {
    // TODO: Implémenter l'export
    console.log('Export en cours...');
  }

  onBulkAction(action: string): void {
    const selectedStockData = this.stocks.filter(stock => this.selectedStocks.has(stock.id));
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

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD'
    }).format(value);
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
}