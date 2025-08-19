import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ===============================
// INTERFACES ET ENUMS - CORRECTED
// ===============================

export enum TypeMouvement {
  ENTREE = 'ENTREE',
  SORTIE = 'SORTIE'
}

export interface StockMovementDTO {
  id?: number;
  articleId: number;
  articleNom?: string;
  articleDesignation?: string; // Added missing field
  typeMouvement: TypeMouvement;
  quantite: number;
  prixUnitaire?: number;
  valeurTotale?: number;
  fournisseurId?: number;
  fournisseurNom?: string;
  client?: string;
  motif?: string;
  numeroBon?: string;
  numeroFacture?: string;
  dateMouvement: Date;
  utilisateur?: string;
  observations?: string;
  stockAvant?: number;
  stockApres?: number;
  dateCreation?: Date;
  dateModification?: Date;
}

export interface EntreeStockRequestDTO {
  articleId: number;
  quantite: number;
  prixUnitaire: number;
  fournisseurId?: number;
  numeroBon?: string;
  numeroFacture?: string;
  dateMouvement?: Date;
  utilisateur?: string;
  observations?: string;
  motif?: string;
}

export interface SortieStockRequestDTO {
  articleId: number;
  quantite: number;
  client?: string;
  motif?: string;
  numeroBon?: string;
  dateMouvement?: Date;
  utilisateur?: string;
  observations?: string;
}

export interface SearchCriteriaDTO {
  typeMouvement?: TypeMouvement;
  articleId?: number;
  fournisseurId?: number;
  dateDebut?: string;
  dateFin?: string;
  client?: string;
  numeroBon?: string;
  numeroFacture?: string;
  utilisateur?: string;
  quantiteMin?: number;
  quantiteMax?: number;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: string;
}

export interface PagedResponseDTO<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ApiResponseDTO<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: Date;
}

export interface Article {
  id: number;
  code: string;
  nom: string;
  designation?: string;
  description?: string;
  prixUnitaire?: number;
  stockActuel?: number;
}

export interface Fournisseur {
  id: number;
  nom: string;
  code?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
}

// ===============================
// SERVICES - CORRECTED
// ===============================

@Injectable({
  providedIn: 'root'
})
export class StockMovementService {
  private baseUrl = 'http://localhost:8090/api/stock-movements';

  constructor(private http: HttpClient) {}

  getAllMovements(params: any): Observable<ApiResponseDTO<PagedResponseDTO<StockMovementDTO>>> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        httpParams = httpParams.set(key, params[key].toString());
      }
    });

    return this.http.get<ApiResponseDTO<PagedResponseDTO<StockMovementDTO>>>(`${this.baseUrl}`, { params: httpParams });
  }

  getTodayMovements(): Observable<ApiResponseDTO<StockMovementDTO[]>> {
    return this.http.get<ApiResponseDTO<StockMovementDTO[]>>(`${this.baseUrl}/today`);
  }

  processEntreeStock(request: EntreeStockRequestDTO): Observable<ApiResponseDTO<StockMovementDTO>> {
    return this.http.post<ApiResponseDTO<StockMovementDTO>>(`${this.baseUrl}/entree`, request);
  }

  processSortieStock(request: SortieStockRequestDTO): Observable<ApiResponseDTO<StockMovementDTO>> {
    return this.http.post<ApiResponseDTO<StockMovementDTO>>(`${this.baseUrl}/sortie`, request);
  }

  searchMovementsByText(searchTerm: string, page: number, size: number): Observable<ApiResponseDTO<PagedResponseDTO<StockMovementDTO>>> {
    const params = new HttpParams()
      .set('searchTerm', searchTerm)
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<ApiResponseDTO<PagedResponseDTO<StockMovementDTO>>>(`${this.baseUrl}/search`, { params });
  }

  searchMovements(criteria: SearchCriteriaDTO): Observable<ApiResponseDTO<PagedResponseDTO<StockMovementDTO>>> {
    return this.http.post<ApiResponseDTO<PagedResponseDTO<StockMovementDTO>>>(`${this.baseUrl}/search/advanced`, criteria);
  }

  processBatchEntreeStock(movements: EntreeStockRequestDTO[]): Observable<ApiResponseDTO<StockMovementDTO[]>> {
    return this.http.post<ApiResponseDTO<StockMovementDTO[]>>(`${this.baseUrl}/batch/entree`, movements);
  }

  processBatchSortieStock(movements: SortieStockRequestDTO[]): Observable<ApiResponseDTO<StockMovementDTO[]>> {
    return this.http.post<ApiResponseDTO<StockMovementDTO[]>>(`${this.baseUrl}/batch/sortie`, movements);
  }

  getArticleMovementHistory(articleId: number, page: number, size: number): Observable<ApiResponseDTO<PagedResponseDTO<StockMovementDTO>>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<ApiResponseDTO<PagedResponseDTO<StockMovementDTO>>>(`${this.baseUrl}/article/${articleId}/history`, { params });
  }

  getMovementById(id: number): Observable<ApiResponseDTO<StockMovementDTO>> {
    return this.http.get<ApiResponseDTO<StockMovementDTO>>(`${this.baseUrl}/${id}`);
  }

  deleteMovement(id: number): Observable<ApiResponseDTO<void>> {
    return this.http.delete<ApiResponseDTO<void>>(`${this.baseUrl}/${id}`);
  }

  exportMovements(criteria?: SearchCriteriaDTO): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/export`, criteria || {}, {
      responseType: 'blob',
      headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    });
  }

  generateReport(criteria?: SearchCriteriaDTO): Observable<ApiResponseDTO<any>> {
    return this.http.post<ApiResponseDTO<any>>(`${this.baseUrl}/report`, criteria || {});
  }
}

@Injectable({
  providedIn: 'root'
})
export class ArticleService {
  private baseUrl = 'http://localhost:8090/api/articles';

  constructor(private http: HttpClient) {}

  getAllArticles(page?: number, size?: number): Observable<ApiResponseDTO<PagedResponseDTO<Article>>> {
    let params = new HttpParams();
    if (page !== undefined) params = params.set('page', page.toString());
    if (size !== undefined) params = params.set('size', size.toString());

    return this.http.get<ApiResponseDTO<PagedResponseDTO<Article>>>(`${this.baseUrl}`, { params });
  }

  getArticleById(id: number): Observable<ApiResponseDTO<Article>> {
    return this.http.get<ApiResponseDTO<Article>>(`${this.baseUrl}/${id}`);
  }

  searchArticles(searchTerm: string): Observable<ApiResponseDTO<Article[]>> {
    const params = new HttpParams().set('search', searchTerm);
    return this.http.get<ApiResponseDTO<Article[]>>(`${this.baseUrl}/search`, { params });
  }
}

@Injectable({
  providedIn: 'root'
})
export class FournisseurService {
  private baseUrl = 'http://localhost:8090/api/fournisseurs';

  constructor(private http: HttpClient) {}

  getAllFournisseurs(page?: number, size?: number): Observable<ApiResponseDTO<PagedResponseDTO<Fournisseur>>> {
    let params = new HttpParams();
    if (page !== undefined) params = params.set('page', page.toString());
    if (size !== undefined) params = params.set('size', size.toString());

    return this.http.get<ApiResponseDTO<PagedResponseDTO<Fournisseur>>>(`${this.baseUrl}`, { params });
  }

  getFournisseurById(id: number): Observable<ApiResponseDTO<Fournisseur>> {
    return this.http.get<ApiResponseDTO<Fournisseur>>(`${this.baseUrl}/${id}`);
  }

  searchFournisseurs(searchTerm: string): Observable<ApiResponseDTO<Fournisseur[]>> {
    const params = new HttpParams().set('search', searchTerm);
    return this.http.get<ApiResponseDTO<Fournisseur[]>>(`${this.baseUrl}/search`, { params });
  }
}

// ===============================
// COMPOSANT PRINCIPAL - FIXED
// ===============================

@Component({
  selector: 'app-stock-movements',
  templateUrl: './stock-movements.component.html',
  styleUrls: ['./stock-movements.component.scss']
})
export class StockMovementsComponent implements OnInit, OnDestroy {

  // ===============================
  // VIEWCHILD ET MODALS - FIXED
  // ===============================

  @ViewChild('addMovementModal', { static: false }) addMovementModal!: TemplateRef<any>;
  @ViewChild('batchOperationModal', { static: false }) batchOperationModal!: TemplateRef<any>;
  @ViewChild('movementDetailsModal', { static: false }) movementDetailsModal!: TemplateRef<any>;

  // Modal refs
  addMovementModalRef?: BsModalRef;
  batchOperationModalRef?: BsModalRef;
  movementDetailsModalRef?: BsModalRef;

  // ===============================
  // OBSERVABLES ET SUBSCRIPTIONS
  // ===============================

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  // ===============================
  // DONNÉES ET PAGINATION
  // ===============================

  movements: StockMovementDTO[] = [];
  totalElements = 0;
  currentPage = 0;
  pageSize = 20;
  totalPages = 0;
  pageSizeOptions = [10, 20, 50, 100];

  // ===============================
  // ÉTATS DU COMPOSANT
  // ===============================

  loading = false;
  searchText = '';
  selectedMovement: StockMovementDTO | null = null;
  quickFilter = 'all';

  // ===============================
  // TYPES ET ÉNUMÉRATIONS
  // ===============================

  typeMouvementOptions = Object.values(TypeMouvement);
  TypeMouvement = TypeMouvement;

  // ===============================
  // DONNÉES DE RÉFÉRENCE
  // ===============================

  articles: Article[] = [];
  fournisseurs: Fournisseur[] = [];

  // ===============================
  // FORMULAIRES
  // ===============================

  movementForm!: FormGroup;
  searchForm!: FormGroup;
  batchForm!: FormGroup;

  // ===============================
  // STATISTIQUES
  // ===============================

  todayStats = {
    totalMovements: 0,
    entries: 0,
    exits: 0,
    totalEntryValue: 0,
    totalExitValue: 0
  };

  // ===============================
  // TRI
  // ===============================

  currentSort = {
    field: 'dateMouvement',
    direction: 'DESC' as 'ASC' | 'DESC'
  };

  // ===============================
  // CONSTRUCTEUR
  // ===============================

  constructor(
    private fb: FormBuilder,
    private modalService: BsModalService,
    private stockMovementService: StockMovementService,
    private articleService: ArticleService,
    private fournisseurService: FournisseurService
  ) {
    this.initializeForms();
  }

  // ===============================
  // LIFECYCLE HOOKS
  // ===============================

  ngOnInit(): void {
    this.setupSearchSubscription();
    this.loadReferenceData();
    this.loadData();
    this.loadTodayStatistics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Fermer tous les modals ouverts
    this.addMovementModalRef?.hide();
    this.batchOperationModalRef?.hide();
    this.movementDetailsModalRef?.hide();
  }



  private initializeForms(): void {
    // Formulaire principal pour les mouvements - FIXED VALIDATORS
    this.movementForm = this.fb.group({
      typeMouvement: ['', Validators.required],
      articleId: ['', Validators.required],
      quantite: ['', [Validators.required, Validators.min(1)]],
      prixUnitaire: [''],
      fournisseurId: [''],
      client: [''],
      motif: [''],
      numeroBon: [''],
      numeroFacture: [''],
      dateMouvement: [this.getCurrentDateString(), Validators.required],
      utilisateur: [''],
      observations: ['']
    });

    // Formulaire de recherche avancée
    this.searchForm = this.fb.group({
      typeMouvement: [''],
      articleId: [''],
      fournisseurId: [''],
      dateDebut: [''],
      dateFin: [''],
      client: [''],
      numeroBon: [''],
      numeroFacture: [''],
      utilisateur: [''],
      quantiteMin: ['', [Validators.min(0)]],
      quantiteMax: ['', [Validators.min(0)]]
    });

    // Formulaire pour les opérations en lot
    this.batchForm = this.fb.group({
      typeMouvement: ['', Validators.required],
      movements: this.fb.array([])
    });

    // Surveiller les changements du type de mouvement - FIXED
    this.movementForm.get('typeMouvement')?.valueChanges.subscribe(type => {
      this.onMovementTypeChange(type);
    });
  }

  private setupSearchSubscription(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.performTextSearch(searchTerm);
    });
  }

  private onMovementTypeChange(type: TypeMouvement): void {
    const prixUnitaireControl = this.movementForm.get('prixUnitaire');

    // Reset validations
    prixUnitaireControl?.clearValidators();

    if (type === TypeMouvement.ENTREE) {
      // Pour les entrées, le prix unitaire est obligatoire
      prixUnitaireControl?.setValidators([Validators.required, Validators.min(0.01)]);
    } else {
      // Pour les sorties, le prix unitaire n'est pas obligatoire
      prixUnitaireControl?.clearValidators();
    }

    // Update validators
    prixUnitaireControl?.updateValueAndValidity();
  }

  // ===============================
  // CHARGEMENT DES DONNÉES
  // ===============================

  loadData(): void {
    this.loading = true;

    const params = {
      page: this.currentPage,
      size: this.pageSize,
      sortBy: this.currentSort.field,
      sortDirection: this.currentSort.direction
    };

    // Appliquer le filtre rapide
    if (this.quickFilter !== 'all') {
      this.applyQuickFilter(params);
    }

    this.stockMovementService.getAllMovements(params).subscribe({
      next: (response: ApiResponseDTO<PagedResponseDTO<StockMovementDTO>>) => {
        this.handleMovementsResponse(response);
      },
      error: (error: any) => {
        this.handleError('Erreur lors du chargement des mouvements', error);
      }
    });
  }

  private applyQuickFilter(params: any): void {
    const today = new Date().toISOString().split('T')[0];

    switch (this.quickFilter) {
      case 'entries':
        params.typeMouvement = TypeMouvement.ENTREE;
        break;
      case 'exits':
        params.typeMouvement = TypeMouvement.SORTIE;
        break;
      case 'today':
        params.dateDebut = today;
        params.dateFin = today;
        break;
    }
  }

  private handleMovementsResponse(response: ApiResponseDTO<PagedResponseDTO<StockMovementDTO>>): void {
    if (response.success) {
      this.movements = response.data.content;
      this.totalElements = response.data.totalElements;
      this.totalPages = response.data.totalPages;
    } else {
      this.showError(response.message || 'Erreur lors du chargement des données');
    }
    this.loading = false;
  }

  private loadTodayStatistics(): void {
    this.stockMovementService.getTodayMovements().subscribe({
      next: (response: ApiResponseDTO<StockMovementDTO[]>) => {
        if (response.success) {
          this.calculateTodayStats(response.data);
        }
      },
      error: (error: any) => {
        console.error('Erreur lors du chargement des statistiques:', error);
      }
    });
  }

  private calculateTodayStats(todayMovements: StockMovementDTO[]): void {
    this.todayStats = {
      totalMovements: todayMovements.length,
      entries: todayMovements.filter(m => m.typeMouvement === TypeMouvement.ENTREE).length,
      exits: todayMovements.filter(m => m.typeMouvement === TypeMouvement.SORTIE).length,
      totalEntryValue: todayMovements
        .filter(m => m.typeMouvement === TypeMouvement.ENTREE)
        .reduce((sum, m) => sum + (m.valeurTotale || 0), 0),
      totalExitValue: todayMovements
        .filter(m => m.typeMouvement === TypeMouvement.SORTIE)
        .reduce((sum, m) => sum + (m.valeurTotale || 0), 0)
    };
  }

  private loadReferenceData(): void {
    // Charger les articles
    this.articleService.getAllArticles(0, 1000).subscribe({
      next: (response: ApiResponseDTO<PagedResponseDTO<Article>>) => {
        if (response.success) {
          this.articles = response.data.content;
        }
      },
      error: (error: any) => {
        console.error('Erreur lors du chargement des articles:', error);
      }
    });

    // Charger les fournisseurs
    this.fournisseurService.getAllFournisseurs(0, 1000).subscribe({
      next: (response: ApiResponseDTO<PagedResponseDTO<Fournisseur>>) => {
        if (response.success) {
          this.fournisseurs = response.data.content;
        }
      },
      error: (error: any) => {
        console.error('Erreur lors du chargement des fournisseurs:', error);
      }
    });
  }

  // ===============================
  // GESTION DES MODALS - FIXED
  // ===============================

  openAddMovementDialog(): void {
    this.resetMovementForm();
    this.addMovementModalRef = this.modalService.show(this.addMovementModal, {
      class: 'modal-lg',
      backdrop: 'static',
      keyboard: false
    });
  }

  openBatchOperationDialog(): void {
    this.resetBatchForm();
    this.batchOperationModalRef = this.modalService.show(this.batchOperationModal, {
      class: 'modal-xl',
      backdrop: 'static',
      keyboard: false
    });
  }

  viewMovementDetails(movement: StockMovementDTO): void {
    this.selectedMovement = movement;
    this.movementDetailsModalRef = this.modalService.show(this.movementDetailsModal, {
      class: 'modal-lg'
    });
  }

  private resetMovementForm(): void {
    this.movementForm.reset();
    this.movementForm.patchValue({
      dateMouvement: this.getCurrentDateString(),
      utilisateur: this.getCurrentUser()
    });
  }

  private resetBatchForm(): void {
    this.batchForm.reset();
    this.clearBatchMovements();
  }

  // ===============================
  // OPÉRATIONS CRUD - FIXED
  // ===============================

  saveMovement(): void {
    if (this.movementForm.invalid) {
      this.markFormGroupTouched(this.movementForm);
      this.showError('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    const formValue = this.movementForm.value;
    this.loading = true;

    if (formValue.typeMouvement === TypeMouvement.ENTREE) {
      this.processEntreeStock(formValue);
    } else if (formValue.typeMouvement === TypeMouvement.SORTIE) {
      this.processSortieStock(formValue);
    } else {
      this.loading = false;
      this.showError('Type de mouvement non pris en charge pour cette opération');
    }
  }

  private processEntreeStock(formValue: any): void {
    const entreeRequest: EntreeStockRequestDTO = {
      articleId: parseInt(formValue.articleId),
      quantite: parseInt(formValue.quantite),
      prixUnitaire: parseFloat(formValue.prixUnitaire) || 0,
      fournisseurId: formValue.fournisseurId ? parseInt(formValue.fournisseurId) : undefined,
      numeroBon: formValue.numeroBon || undefined,
      numeroFacture: formValue.numeroFacture || undefined,
      dateMouvement: formValue.dateMouvement ? new Date(formValue.dateMouvement + 'T00:00:00') : new Date(),
      utilisateur: formValue.utilisateur || undefined,
      observations: formValue.observations || undefined,
      motif: formValue.motif || undefined
    };

    this.stockMovementService.processEntreeStock(entreeRequest).subscribe({
      next: (response: ApiResponseDTO<StockMovementDTO>) => {
        this.handleSaveResponse(response, 'Entrée de stock effectuée avec succès');
      },
      error: (error: any) => {
        this.handleError('Erreur lors de l\'entrée de stock', error);
      }
    });
  }

  private processSortieStock(formValue: any): void {
    const sortieRequest: SortieStockRequestDTO = {
      articleId: parseInt(formValue.articleId),
      quantite: parseInt(formValue.quantite),
      client: formValue.client || undefined,
      motif: formValue.motif || undefined,
      numeroBon: formValue.numeroBon || undefined,
      dateMouvement: formValue.dateMouvement ? new Date(formValue.dateMouvement + 'T00:00:00') : new Date(),
      utilisateur: formValue.utilisateur || undefined,
      observations: formValue.observations || undefined
    };

    this.stockMovementService.processSortieStock(sortieRequest).subscribe({
      next: (response: ApiResponseDTO<StockMovementDTO>) => {
        this.handleSaveResponse(response, 'Sortie de stock effectuée avec succès');
      },
      error: (error: any) => {
        this.handleError('Erreur lors de la sortie de stock', error);
      }
    });
  }

  private handleSaveResponse(response: ApiResponseDTO<StockMovementDTO>, successMessage: string): void {
    if (response.success) {
      this.showSuccess(successMessage);
      this.addMovementModalRef?.hide();
      this.refreshData();
    } else {
      this.showError(response.message || 'Erreur lors de l\'enregistrement');
    }
    this.loading = false;
  }

  // ===============================
  // RECHERCHE ET FILTRAGE
  // ===============================

  onSearchTextChange(searchText: string): void {
    this.searchText = searchText;
    this.searchSubject.next(searchText);
  }

  onQuickFilterChange(filter: string): void {
    this.quickFilter = filter;
    this.currentPage = 0;
    this.loadData();
  }

  private performTextSearch(searchTerm: string): void {
    if (!searchTerm.trim()) {
      this.currentPage = 0;
      this.loadData();
      return;
    }

    this.loading = true;

    this.stockMovementService.searchMovementsByText(searchTerm, this.currentPage, this.pageSize).subscribe({
      next: (response: ApiResponseDTO<PagedResponseDTO<StockMovementDTO>>) => {
        this.handleMovementsResponse(response);
      },
      error: (error: any) => {
        this.handleError('Erreur lors de la recherche', error);
      }
    });
  }

  performAdvancedSearch(): void {
    const formValue = this.searchForm.value;

    // Validation des dates
    if (formValue.dateDebut && formValue.dateFin && formValue.dateDebut > formValue.dateFin) {
      this.showError('La date de début ne peut pas être postérieure à la date de fin');
      return;
    }

    // Validation des quantités
    if (formValue.quantiteMin && formValue.quantiteMax && formValue.quantiteMin > formValue.quantiteMax) {
      this.showError('La quantité minimum ne peut pas être supérieure à la quantité maximum');
      return;
    }

    const criteria: SearchCriteriaDTO = {
      ...formValue,
      page: 0,
      size: this.pageSize,
      sortBy: this.currentSort.field,
      sortDirection: this.currentSort.direction
    };

    // Nettoyer les valeurs vides
    Object.keys(criteria).forEach(key => {
      if (criteria[key as keyof SearchCriteriaDTO] === '' || criteria[key as keyof SearchCriteriaDTO] === null) {
        delete criteria[key as keyof SearchCriteriaDTO];
      }
    });

    this.loading = true;

    this.stockMovementService.searchMovements(criteria).subscribe({
      next: (response: ApiResponseDTO<PagedResponseDTO<StockMovementDTO>>) => {
        this.handleMovementsResponse(response);
        this.currentPage = 0;
      },
      error: (error: any) => {
        this.handleError('Erreur lors de la recherche avancée', error);
      }
    });
  }

  clearSearch(): void {
    this.searchText = '';
    this.searchForm.reset();
    this.quickFilter = 'all';
    this.currentPage = 0;
    this.loadData();
  }

  // ===============================
  // PAGINATION ET TRI
  // ===============================

  onSortChange(field: string): void {
    if (this.currentSort.field === field) {
      this.currentSort.direction = this.currentSort.direction === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.currentSort.field = field;
      this.currentSort.direction = 'ASC';
    }
    this.currentPage = 0;
    this.loadData();
  }

  onPageSizeChange(): void {
    this.currentPage = 0;
    this.loadData();
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadData();
    }
  }

  getVisiblePages(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    const halfVisible = Math.floor(maxVisiblePages / 2);

    let startPage = Math.max(0, this.currentPage - halfVisible);
    let endPage = Math.min(this.totalPages - 1, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(0, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  // ===============================
  // OPÉRATIONS EN LOT - FIXED
  // ===============================

  get batchMovements(): FormArray {
    return this.batchForm.get('movements') as FormArray;
  }

  addBatchMovement(): void {
    const movementGroup = this.fb.group({
      articleId: ['', Validators.required],
      quantite: ['', [Validators.required, Validators.min(1)]],
      prixUnitaire: ['', [Validators.min(0)]],
      fournisseurId: [''],
      client: [''],
      numeroBon: [''],
      observations: ['']
    });

    this.batchMovements.push(movementGroup);
  }

  removeBatchMovement(index: number): void {
    if (this.batchMovements.length > 0) {
      this.batchMovements.removeAt(index);
    }
  }

  clearBatchMovements(): void {
    while (this.batchMovements.length !== 0) {
      this.batchMovements.removeAt(0);
    }
  }

  processBatchOperation(): void {
    if (this.batchForm.invalid || this.batchMovements.length === 0) {
      this.markFormGroupTouched(this.batchForm);
      this.showError('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    const typeMouvement = this.batchForm.get('typeMouvement')?.value;
    const movements = this.batchMovements.value;

    // Validation des mouvements
    const invalidMovements = movements.filter((movement: any, index: number) => {
      return !movement.articleId || !movement.quantite || movement.quantite <= 0 ||
        (typeMouvement === TypeMouvement.ENTREE && (!movement.prixUnitaire || movement.prixUnitaire <= 0));
    });

    if (invalidMovements.length > 0) {
      this.showError('Certains mouvements contiennent des erreurs. Veuillez vérifier les données saisies.');
      return;
    }

    this.loading = true;

    if (typeMouvement === TypeMouvement.ENTREE) {
      this.processBatchEntreeStock(movements);
    } else if (typeMouvement === TypeMouvement.SORTIE) {
      this.processBatchSortieStock(movements);
    } else {
      this.loading = false;
      this.showError('Type de mouvement non pris en charge pour les opérations en lot');
    }
  }

  private processBatchEntreeStock(movements: any[]): void {
    const processedMovements: EntreeStockRequestDTO[] = movements.map(movement => ({
      articleId: parseInt(movement.articleId),
      quantite: parseInt(movement.quantite),
      prixUnitaire: parseFloat(movement.prixUnitaire) || 0,
      fournisseurId: movement.fournisseurId ? parseInt(movement.fournisseurId) : undefined,
      numeroBon: movement.numeroBon || undefined,
      observations: movement.observations || undefined,
      dateMouvement: new Date(),
      utilisateur: this.getCurrentUser()
    }));

    this.stockMovementService.processBatchEntreeStock(processedMovements).subscribe({
      next: (response: ApiResponseDTO<StockMovementDTO[]>) => {
        this.handleBatchResponse(response, 'entrées');
      },
      error: (error: any) => {
        this.handleError('Erreur lors des entrées en lot', error);
      }
    });
  }

  private processBatchSortieStock(movements: any[]): void {
    const processedMovements: SortieStockRequestDTO[] = movements.map(movement => ({
      articleId: parseInt(movement.articleId),
      quantite: parseInt(movement.quantite),
      client: movement.client || undefined,
      numeroBon: movement.numeroBon || undefined,
      observations: movement.observations || undefined,
      dateMouvement: new Date(),
      utilisateur: this.getCurrentUser()
    }));

    this.stockMovementService.processBatchSortieStock(processedMovements).subscribe({
      next: (response: ApiResponseDTO<StockMovementDTO[]>) => {
        this.handleBatchResponse(response, 'sorties');
      },
      error: (error: any) => {
        this.handleError('Erreur lors des sorties en lot', error);
      }
    });
  }

  private handleBatchResponse(response: ApiResponseDTO<StockMovementDTO[]>, operationType: string): void {
    if (response.success) {
      this.showSuccess(`${response.data.length} ${operationType} de stock effectuées avec succès`);
      this.batchOperationModalRef?.hide();
      this.refreshData();
    } else {
      this.showError(response.message || `Erreur lors des ${operationType} en lot`);
    }
    this.loading = false;
  }

  // ===============================
  // DÉTAILS ET VISUALISATION
  // ===============================

  getArticleMovementHistory(articleId: number): void {
    this.stockMovementService.getArticleMovementHistory(articleId, 0, 50).subscribe({
      next: (response: ApiResponseDTO<PagedResponseDTO<StockMovementDTO>>) => {
        if (response.success) {
          console.log('Historique des mouvements pour l\'article:', articleId, response.data.content);
          this.showSuccess(`Historique chargé: ${response.data.totalElements} mouvements trouvés`);
        }
      },
      error: (error: any) => {
        this.handleError('Erreur lors du chargement de l\'historique', error);
      }
    });
  }

  printMovementDetails(movement: StockMovementDTO): void {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const printContent = this.generatePrintContent(movement);
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  }

  private generatePrintContent(movement: StockMovementDTO): string {
    return `
      <html>
        <head>
          <title>Détails du Mouvement #${movement.id}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .details { margin: 20px 0; }
            .detail-row { margin: 10px 0; }
            .label { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Mouvement de Stock #${movement.id}</h1>
            <p>Date: ${new Date(movement.dateMouvement).toLocaleDateString('fr-FR')}</p>
          </div>
          <div class="details">
            <div class="detail-row">
              <span class="label">Type:</span> ${movement.typeMouvement}
            </div>
            <div class="detail-row">
              <span class="label">Article:</span>  ${movement.articleNom || movement.articleDesignation}
            </div>
            <div class="detail-row">
              <span class="label">Quantité:</span> ${movement.quantite}
            </div>
            ${movement.prixUnitaire ? `<div class="detail-row"><span class="label">Prix unitaire:</span> ${movement.prixUnitaire} MAD</div>` : ''}
            ${movement.valeurTotale ? `<div class="detail-row"><span class="label">Valeur totale:</span> ${movement.valeurTotale} MAD</div>` : ''}
            ${movement.fournisseurNom ? `<div class="detail-row"><span class="label">Fournisseur:</span> ${movement.fournisseurNom}</div>` : ''}
            ${movement.client ? `<div class="detail-row"><span class="label">Client:</span> ${movement.client}</div>` : ''}
            ${movement.numeroBon ? `<div class="detail-row"><span class="label">Numéro de bon:</span> ${movement.numeroBon}</div>` : ''}
            ${movement.observations ? `<div class="detail-row"><span class="label">Observations:</span> ${movement.observations}</div>` : ''}
          </div>
        </body>
      </html>
    `;
  }

  // ===============================
  // EXPORT ET RAPPORTS
  // ===============================

  exportMovements(): void {
    this.loading = true;

    const criteria: SearchCriteriaDTO = {
      ...this.searchForm.value,
      typeMouvement: this.quickFilter === 'entries' ? TypeMouvement.ENTREE :
                     this.quickFilter === 'exits' ? TypeMouvement.SORTIE : undefined
    };

    // Nettoyer les valeurs vides
    Object.keys(criteria).forEach(key => {
      if (criteria[key as keyof SearchCriteriaDTO] === '' || criteria[key as keyof SearchCriteriaDTO] === null) {
        delete criteria[key as keyof SearchCriteriaDTO];
      }
    });

    this.stockMovementService.exportMovements(criteria).subscribe({
      next: (blob: Blob) => {
        this.downloadFile(blob, 'mouvements-stock.xlsx');
        this.showSuccess('Export réalisé avec succès');
        this.loading = false;
      },
      error: (error: any) => {
        this.handleError('Erreur lors de l\'export', error);
      }
    });
  }

  generateReport(): void {
    this.loading = true;

    const criteria: SearchCriteriaDTO = {
      ...this.searchForm.value,
      typeMouvement: this.quickFilter === 'entries' ? TypeMouvement.ENTREE :
                     this.quickFilter === 'exits' ? TypeMouvement.SORTIE : undefined
    };

    this.stockMovementService.generateReport(criteria).subscribe({
      next: (response: ApiResponseDTO<any>) => {
        if (response.success) {
          console.log('Rapport généré:', response.data);
          this.showSuccess('Rapport généré avec succès');
        } else {
          this.showError(response.message || 'Erreur lors de la génération du rapport');
        }
        this.loading = false;
      },
      error: (error: any) => {
        this.handleError('Erreur lors de la génération du rapport', error);
      }
    });
  }

  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // ===============================
  // ACTIONS SUR LES MOUVEMENTS
  // ===============================

  editMovement(movement: StockMovementDTO): void {
    console.log('Modifier le mouvement:', movement);
    this.showInfo('Fonctionnalité de modification en cours de développement');
  }

  duplicateMovement(movement: StockMovementDTO): void {
    this.movementForm.patchValue({
      typeMouvement: movement.typeMouvement,
      articleId: movement.articleId,
      quantite: movement.quantite,
      prixUnitaire: movement.prixUnitaire,
      fournisseurId: movement.fournisseurId,
      client: movement.client,
      motif: movement.motif,
      numeroBon: movement.numeroBon,
      numeroFacture: movement.numeroFacture,
      dateMouvement: this.getCurrentDateString(),
      utilisateur: this.getCurrentUser(),
      observations: movement.observations
    });

    this.openAddMovementDialog();
  }

  deleteMovement(movement: StockMovementDTO): void {
    if (confirm(`Êtes-vous sûr de vouloir annuler le mouvement #${movement.id} ?`)) {
      this.loading = true;

      this.stockMovementService.deleteMovement(movement.id!).subscribe({
        next: (response: ApiResponseDTO<void>) => {
          if (response.success) {
            this.showSuccess('Mouvement annulé avec succès');
            this.refreshData();
          } else {
            this.showError(response.message || 'Erreur lors de l\'annulation');
          }
          this.loading = false;
        },
        error: (error: any) => {
          this.handleError('Erreur lors de l\'annulation du mouvement', error);
        }
      });
    }
  }

  // ===============================
  // UTILITAIRES - FIXED
  // ===============================

  trackByMovementId(index: number, movement: StockMovementDTO): any {
    return movement.id || index;
  }

  trackByArticleId(index: number, article: Article): any {
    return article.id || index;
  }

  trackByFournisseurId(index: number, fournisseur: Fournisseur): any {
    return fournisseur.id || index;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach((arrayControl) => {
          if (arrayControl instanceof FormGroup) {
            this.markFormGroupTouched(arrayControl);
          } else {
            arrayControl.markAsTouched();
          }
        });
      }
    });
  }

  private getCurrentDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getCurrentUser(): string {
    // À implémenter selon votre système d'authentification
    return 'Utilisateur actuel';
  }

  private refreshData(): void {
    this.loadData();
    this.loadTodayStatistics();
  }

  private handleError(message: string, error?: any): void {
    console.error(message, error);
    this.loading = false;

    // Extraire le message d'erreur de la réponse
    let errorMessage = message;
    if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.message) {
      errorMessage = error.message;
    }

    this.showError(errorMessage);
  }

  // ===============================
  // NOTIFICATIONS - IMPROVED
  // ===============================

  private showSuccess(message: string): void {
    console.log('SUCCESS:', message);
    this.showNotification(message, 'success');
  }

  private showError(message: string): void {
    console.error('ERROR:', message);
    this.showNotification(message, 'danger');
  }

  private showInfo(message: string): void {
    console.info('INFO:', message);
    this.showNotification(message, 'info');
  }

  private showNotification(message: string, type: 'success' | 'danger' | 'info' | 'warning'): void {
    // Créer le conteneur de toasts s'il n'existe pas
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
      toastContainer.style.zIndex = '9999';
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;

    toastContainer.appendChild(toast);

    // Vérifier si Bootstrap est disponible
    if (typeof (window as any).bootstrap !== 'undefined') {
      const bsToast = new (window as any).bootstrap.Toast(toast, {
        autohide: true,
        delay: type === 'danger' ? 5000 : 3000
      });
      bsToast.show();

      // Supprimer le toast après fermeture
      toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
      });
    } else {
      // Fallback si Bootstrap n'est pas disponible
      toast.style.display = 'block';
      setTimeout(() => {
        toast.remove();
      }, type === 'danger' ? 5000 : 3000);
    }
  }

  // ===============================
  // GETTERS POUR LE TEMPLATE
  // ===============================

  get Math() {
    return Math;
  }

  get isSearchActive(): boolean {
    return this.searchText.length > 0 || this.quickFilter !== 'all';
  }

  get hasMovements(): boolean {
    return this.movements.length > 0;
  }

  get isLoading(): boolean {
    return this.loading;
  }

  // ===============================
  // MÉTHODES POUR LE TEMPLATE - FIXED
  // ===============================

  getMovementTypeColor(type: TypeMouvement): string {
    switch (type) {
      case TypeMouvement.ENTREE:
        return 'success';
      case TypeMouvement.SORTIE:
        return 'danger';
      default:
        return 'secondary';
    }
  }

  getMovementTypeIcon(type: TypeMouvement): string {
    switch (type) {
      case TypeMouvement.ENTREE:
        return 'fa-plus-circle';
      case TypeMouvement.SORTIE:
        return 'fa-minus-circle';
      default:
        return 'fa-question-circle';
    }
  }

  formatCurrency(value: number | undefined): string {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD'
    }).format(value);
  }

  formatNumber(value: number | undefined): string {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('fr-FR').format(value);
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR');
  }

  formatDateTime(date: Date | string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleString('fr-FR');
  }

  getSortIcon(field: string): string {
    if (this.currentSort.field !== field) {
      return 'fa-sort';
    }
    return this.currentSort.direction === 'ASC' ? 'fa-sort-up' : 'fa-sort-down';
  }

  getArticleName(articleId: number): string {
    const article = this.articles.find(a => a.id === articleId);
    return article ? `${article.code} - ${article.nom || article.designation}` : 'Article inconnu';
  }

  getFournisseurName(fournisseurId: number): string {
    const fournisseur = this.fournisseurs.find(f => f.id === fournisseurId);
    return fournisseur ? fournisseur.nom : 'Fournisseur inconnu';
  }

  // ===============================
  // MÉTHODES POUR LES ÉVÉNEMENTS DU TEMPLATE
  // ===============================

  onQuickFilterRadioChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.checked) {
      this.onQuickFilterChange(target.value);
    }
  }
}