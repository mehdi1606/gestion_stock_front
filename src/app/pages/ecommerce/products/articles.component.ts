// articles.component.ts
import { Component , OnInit, TemplateRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import axios from 'axios';
import Swal from 'sweetalert2';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { Router } from '@angular/router';
interface Article {
  id?: number;
  nom: string;
  description?: string;
  categorie: string;
  unite: string;
  prixUnitaire: number;
  stockMin: number;
  stockMax: number;

  // Fixed stock field mapping to match backend DTO
  quantiteActuelle?: number;  // This matches the backend ArticleDTO field
  valeurStock?: number;
  derniereEntree?: string;
  derniereSortie?: string;

  fournisseurPrincipalId?: number;     // This matches the backend
  fournisseurPrincipalNom?: string;    // This matches the backend
  actif?: boolean;
  dateCreation?: string;
  dateModification?: string;
}


interface Fournisseur {
  id: number;
  nom: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
}

interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

@Component({
  selector: 'app-articles',
  templateUrl: './articles.component.html',
  styleUrls: ['./articles.component.scss'],

})
export class ArticlesComponent implements OnInit {
  // Data properties
  articles: Article[] = [];
  allArticles: Article[] = [];
  fournisseurs: Fournisseur[] = [];
  categories: string[] = [];

  // Forms
  formData: FormGroup;
  searchForm: FormGroup;

  // UI State
  submitted = false;
  term: string = '';
  modalRef?: BsModalRef;
  selectedArticleId?: number;
  isEditMode = false;
  loading = false;

  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  // Filters
  selectedCategorie = '';
  selectedFournisseur = '';
  selectedStatus = '';
  stockFilter = '';

  // Statistics
  statistics = {
    total: 0,
    actifs: 0,
    inactifs: 0,
    stockCritique: 0,
    stockFaible: 0,
    stockVide: 0,
    stockExcessif: 0,
    categories: 0
  };

  // Stock status colors
  stockColors = {
    critique: 'danger',
    faible: 'warning',
    normal: 'success',
    excessif: 'info',
    vide: 'secondary'
  };

  private apiUrl = 'http://localhost:8090/api/articles';
  private fournisseursUrl = 'http://localhost:8090/api/fournisseurs';

  constructor(
    private modalService: BsModalService,
    private formBuilder: FormBuilder,
    private router: Router
  ) {
    this.initForms();
  }

  ngOnInit(): void {
    this.fetchArticles();
    this.loadReferenceData();
    this.loadStatistics();
  }

  initForms() {
    this.formData = this.formBuilder.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      categorie: ['', [Validators.required]],
      unite: ['', [Validators.required]],
      prixUnitaire: [0, [Validators.required, Validators.min(0)]],
      stockMin: [0, [Validators.required, Validators.min(0)]],
      stockMax: [0, [Validators.required, Validators.min(0)]],
      fournisseurPrincipalId: [''],  // Fixed field name to match backend
      actif: [true]
    });

    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      categorie: [''],
      fournisseur: [''],
      status: [''],
      stockFilter: ['']
    });
  }

  // ========================
  // CRUD OPERATIONS
  // ========================

  async fetchArticles() {
    this.loading = true;
    try {
      const response = await axios.get<ApiResponse<PagedResponse<Article>>>(
        `${this.apiUrl}?page=${this.currentPage}&size=${this.pageSize}&sortBy=dateCreation&sortDirection=DESC`
      );

      if (response.data.success) {
        this.articles = response.data.data.content;
        this.totalElements = response.data.data.totalElements;
        this.totalPages = response.data.data.totalPages;
        this.allArticles = [...this.articles];
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
      this.showError('Erreur lors du chargement des articles');
    } finally {
      this.loading = false;
    }
    console.log('Articles fetched:', this.articles);
  }
  async saveArticle() {
    this.submitted = true;
    if (this.formData.invalid) return;

    // Map form data to match backend expected field names
    const articleData: any = {
      nom: this.formData.value.nom,
      description: this.formData.value.description,
      categorie: this.formData.value.categorie,
      unite: this.formData.value.unite,
      prixUnitaire: this.formData.value.prixUnitaire,
      stockMin: this.formData.value.stockMin,
      stockMax: this.formData.value.stockMax,
      fournisseurPrincipalId: this.formData.value.fournisseurPrincipalId || null,  // Fixed field name
      actif: this.formData.value.actif
    };

    this.loading = true;

    try {
      let response: any;

      if (this.selectedArticleId) {
        response = await axios.put<ApiResponse<Article>>(
          `${this.apiUrl}/${this.selectedArticleId}`,
          articleData
        );
        Swal.fire('Succès!', 'Article modifié avec succès.', 'success');
      } else {
        response = await axios.post<ApiResponse<Article>>(
          this.apiUrl,
          articleData
        );
        Swal.fire('Succès!', 'Article ajouté avec succès.', 'success');
      }

      this.fetchArticles();
      this.loadStatistics();
      this.modalRef?.hide();
      this.resetForm();

    } catch (error: any) {
      console.error('Error saving article:', error);
      const errorMessage = error.response?.data?.message || 'Erreur lors de la sauvegarde';
      this.showError(errorMessage);
    } finally {
      this.loading = false;
    }
  }
  async deleteArticle(id: number) {
    const result = await Swal.fire({
      title: 'Êtes-vous sûr?',
      text: 'Cette action va désactiver l\'article.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, désactiver!',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#d33'
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`${this.apiUrl}/${id}`);
        this.fetchArticles();
        this.loadStatistics();
        Swal.fire('Désactivé!', 'L\'article a été désactivé.', 'success');
      } catch (error) {
        console.error('Error deleting article:', error);
        this.showError('Erreur lors de la suppression');
      }
    }
  }

  async reactivateArticle(id: number) {
    try {
      await axios.patch(`${this.apiUrl}/${id}/reactivate`);
      this.fetchArticles();
      this.loadStatistics();
      Swal.fire('Réactivé!', 'L\'article a été réactivé.', 'success');
    } catch (error) {
      console.error('Error reactivating article:', error);
      this.showError('Erreur lors de la réactivation');
    }
  }

  // async viewDetails(article: Article) {
  //   try {
  //     const response = await axios.get<ApiResponse<Article>>(`${this.apiUrl}/${article.id}`);

  //     if (response.data.success) {
  //       const details = response.data.data;

  //       Swal.fire({
  //         title: `<strong>${details.designation}</strong>`,
  //         html: `
  //           <div class="text-left">
  //             <p><strong>nom:</strong> ${details.nom}</p>
  //             <p><strong>Description:</strong> ${details.description || 'N/A'}</p>
  //             <p><strong>Catégorie:</strong> ${details.categorie}</p>
  //             <p><strong>Unité:</strong> ${details.unite}</p>
  //             <p><strong>Prix Unitaire:</strong> ${details.prixUnitaire} MAD</p>
  //             <p><strong>Stock Min:</strong> ${details.stockMin}</p>
  //             <p><strong>Stock Max:</strong> ${details.stockMax}</p>
  //             <p><strong>Stock Actuel:</strong> ${details.stockActuel || 0}</p>
  //             <p><strong>Fournisseur:</strong> ${details.fournisseurNom || 'N/A'}</p>
  //             <p><strong>Statut:</strong> <span class="badge ${details.actif ? 'bg-success' : 'bg-secondary'}">${details.actif ? 'Actif' : 'Inactif'}</span></p>
  //           </div>
  //         `,
  //         icon: 'info',
  //         confirmButtonText: 'Fermer',
  //         confirmButtonColor: '#6c63ff',
  //         width: '500px'
  //       });
  //     }
  //   } catch (error) {
  //     console.error('Error fetching details:', error);
  //     this.showError('Erreur lors du chargement des détails');
  //   }
  // }

  // ========================
  // MODAL OPERATIONS
  // ========================

  openModal(content: TemplateRef<any>, article?: Article) {
    this.submitted = false;
    this.modalRef = this.modalService.show(content, {
      class: 'modal-lg',
      backdrop: 'static',
      keyboard: false
    });

    if (article) {
      this.isEditMode = true;
      this.selectedArticleId = article.id;
      this.formData.patchValue(article);
    } else {
      this.isEditMode = false;
      this.resetForm();
    }
  }

  resetForm() {
    this.formData.reset();
    this.selectedArticleId = undefined;
    this.submitted = false;
    this.isEditMode = false;
    this.formData.patchValue({ actif: true, prixUnitaire: 0, stockMin: 0, stockMax: 0 });
  }

  // ========================
  // SEARCH & FILTER
  // ========================

  async performSearch() {
    if (!this.term.trim()) {
      this.articles = [...this.allArticles];
      return;
    }

    this.loading = true;
    try {
      const response = await axios.get<ApiResponse<PagedResponse<Article>>>(
        `${this.apiUrl}/search?q=${encodeURIComponent(this.term)}&page=0&size=50`
      );

      if (response.data.success) {
        this.articles = response.data.data.content;
      }
    } catch (error) {
      console.error('Error searching articles:', error);
      this.showError('Erreur lors de la recherche');
    } finally {
      this.loading = false;
    }
  }

  async applyFilters() {
    const filters = this.searchForm.value;
    let filteredData = [...this.allArticles];

    if (filters.categorie) {
      filteredData = filteredData.filter(a => a.categorie === filters.categorie);
    }

    if (filters.fournisseur) {
      // Fixed to use the correct field name
      filteredData = filteredData.filter(a => a.fournisseurPrincipalId?.toString() === filters.fournisseur);
    }

    if (filters.status !== '') {
      const isActive = filters.status === 'true';
      filteredData = filteredData.filter(a => a.actif === isActive);
    }

    if (filters.stockFilter) {
      await this.applyStockFilter(filters.stockFilter);
      return;
    }

    this.articles = filteredData;
  }
  async applyStockFilter(filterType: string) {
    this.loading = true;
    try {
      let response: any;

      switch (filterType) {
        case 'critical':
          response = await axios.get<ApiResponse<Article[]>>(`${this.apiUrl}/stock/critical`);
          break;
        case 'low':
          response = await axios.get<ApiResponse<Article[]>>(`${this.apiUrl}/stock/low`);
          break;
        case 'empty':
          response = await axios.get<ApiResponse<Article[]>>(`${this.apiUrl}/stock/empty`);
          break;
        case 'excessive':
          response = await axios.get<ApiResponse<Article[]>>(`${this.apiUrl}/stock/excessive`);
          break;
        default:
          this.fetchArticles();
          return;
      }

      if (response.data.success) {
        this.articles = response.data.data;
      }
    } catch (error) {
      console.error('Error applying stock filter:', error);
      this.showError('Erreur lors du filtrage par stock');
    } finally {
      this.loading = false;
    }
  }

  clearFilters() {
    this.searchForm.reset();
    this.term = '';
    this.fetchArticles();
  }

  // ========================
  // REFERENCE DATA
  // ========================

  async loadReferenceData() {
    try {
      const [categoriesResponse, fournisseursResponse] = await Promise.all([
        axios.get<ApiResponse<string[]>>(`${this.apiUrl}/categories`),
        axios.get<ApiResponse<Fournisseur[]>>(`${this.fournisseursUrl}/active`)
      ]);
      console.log('Fournisseurs:', fournisseursResponse.data.data);
      if (categoriesResponse.data.success) {
        this.categories = categoriesResponse.data.data;
      }

      if (fournisseursResponse.data.success) {
        this.fournisseurs = fournisseursResponse.data.data;
      }
    } catch (error) {
      console.error('Error loading reference data:', error);
    }
  }

  async loadStatistics() {
    try {
      const [
        actifsResponse,
        inactifsResponse,
        stockCritiqueResponse,
        stockFaibleResponse,
        stockVideResponse,
        stockExcessifResponse
      ] = await Promise.all([
        axios.get<ApiResponse<number>>(`${this.apiUrl}/count?actif=true`),
        axios.get<ApiResponse<number>>(`${this.apiUrl}/count?actif=false`),
        axios.get<ApiResponse<Article[]>>(`${this.apiUrl}/stock/critical`),
        axios.get<ApiResponse<Article[]>>(`${this.apiUrl}/stock/low`),
        axios.get<ApiResponse<Article[]>>(`${this.apiUrl}/stock/empty`),
        axios.get<ApiResponse<Article[]>>(`${this.apiUrl}/stock/excessive`)
      ]);

      if (actifsResponse.data.success && inactifsResponse.data.success) {
        this.statistics.actifs = actifsResponse.data.data;
        this.statistics.inactifs = inactifsResponse.data.data;
        this.statistics.total = this.statistics.actifs + this.statistics.inactifs;
      }

      if (stockCritiqueResponse.data.success) {
        this.statistics.stockCritique = stockCritiqueResponse.data.data.length;
      }

      if (stockFaibleResponse.data.success) {
        this.statistics.stockFaible = stockFaibleResponse.data.data.length;
      }

      if (stockVideResponse.data.success) {
        this.statistics.stockVide = stockVideResponse.data.data.length;
      }

      if (stockExcessifResponse.data.success) {
        this.statistics.stockExcessif = stockExcessifResponse.data.data.length;
      }

      this.statistics.categories = this.categories.length;
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  }

  // ========================
  // STOCK MANAGEMENT
  // ========================

  getStockStatus(article: Article): string {
    const stock = article.quantiteActuelle || 0;  // Fixed field name

    if (stock === 0) return 'vide';
    if (article.stockMin && stock <= article.stockMin * 0.5) return 'critique';
    if (article.stockMin && stock <= article.stockMin) return 'faible';
    if (article.stockMax && stock >= article.stockMax) return 'excessif';
    return 'normal';
  }
  getStockBadgeClass(article: Article): string {
    const status = this.getStockStatus(article);
    return `bg-${this.stockColors[status] || 'secondary'}`;
  }


  // ========================
  // PAGINATION
  // ========================

  goToPage(page: number) {
    this.currentPage = page;
    this.fetchArticles();
  }

  changePageSize(size: string) {
    this.pageSize = parseInt(size);
    this.currentPage = 0;
    this.fetchArticles();
  }

  // ========================
  // UTILITIES
  // ========================

  showError(message: string) {
    Swal.fire('Erreur!', message, 'error');
  }

  async checknomExists(nom: string): Promise<boolean> {
    if (!nom) return false;

    try {
      const response = await axios.get<ApiResponse<boolean>>(`${this.apiUrl}/exists/nom/${nom}`);
      return response.data.success ? response.data.data : false;
    } catch (error) {
      return false;
    }
  }

  async exportData() {
    Swal.fire('Export', 'Fonctionnalité d\'export en cours de développement', 'info');
  }

  async generateReport() {
    try {
      const response = await axios.get<ApiResponse<any>>(`${this.apiUrl}/stats/by-category`);
      if (response.data.success) {
        console.log('Statistics data:', response.data.data);
        Swal.fire('Rapport', 'Rapport généré avec succès (voir console)', 'success');
      }
    } catch (error) {
      this.showError('Erreur lors de la génération du rapport');
    }
  }

  // ========================
  // GETTERS
  // ========================

  get form() {
    return this.formData.controls;
  }

  get searchFormControls() {
    return this.searchForm.controls;
  }

  get pages(): number[] {
    return Array.from({length: this.totalPages}, (_, i) => i);
  }

  get hasData(): boolean {
    return this.articles.length > 0;
  }

  get filteredCount(): number {
    return this.articles.length;
  }

  // Helper for Math functions in template
  get Math() {
    return Math;
  }
// ========================
// SWEETALERT MODALS - REPLACE EXISTING METHODS
// ========================

async openAddEditModal(article?: Article) {
  this.submitted = false;

  if (article) {
    this.isEditMode = true;
    this.selectedArticleId = article.id;
    this.formData.patchValue(article);
  } else {
    this.isEditMode = false;
    this.resetForm();
  }

  const { value: formValues } = await Swal.fire({
    title: this.isEditMode ? 'Modifier l\'Article' : 'Nouvel Article',
    html: `
      <style>
        /* Your existing styles... */
        .swal-form-container {
          text-align: left;
          max-height: 60vh;
          overflow-y: auto;
        }
        .swal-form-section {
          background: white;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .swal-section-title {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          padding: 12px 16px;
          background: #f8fafc;
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
        }
        .swal-section-title i {
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }
        .swal-section-title h4 {
          font-size: 16px !important;
          font-weight: 600 !important;
          color: #1f2937 !important;
          margin: 0 !important;
        }
        .swal-form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        .swal-three-columns {
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        }
        .swal-full-width {
          grid-column: 1 / -1;
        }
        .swal-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .swal-form-label {
          font-size: 13px !important;
          font-weight: 600 !important;
          color: #374151 !important;
          margin-bottom: 4px !important;
        }
        .swal-form-label.required::after {
          content: ' *';
          color: #ef4444;
        }
        .swal-input-wrapper,
        .swal-textarea-wrapper,
        .swal-select-wrapper {
          position: relative;
        }
        .swal-input-icon,
        .swal-textarea-icon,
        .swal-select-icon {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          font-size: 14px;
          pointer-events: none;
        }
        .swal-textarea-icon {
          top: 10px;
          transform: none;
        }
        .swal-form-input,
        .swal-form-textarea,
        .swal-form-select {
          width: 100% !important;
          padding: 10px 36px 10px 12px !important;
          border: 2px solid #e5e7eb !important;
          border-radius: 8px !important;
          font-size: 13px !important;
          background: #f9fafb !important;
          transition: all 0.2s ease !important;
          font-family: inherit !important;
          box-sizing: border-box !important;
        }
        .swal-form-input:focus,
        .swal-form-textarea:focus,
        .swal-form-select:focus {
          outline: none !important;
          border-color: #3b82f6 !important;
          background: white !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
        }
        .swal-form-textarea {
          resize: vertical !important;
          min-height: 60px !important;
          padding-right: 12px !important;
        }
        .swal-form-select {
          cursor: pointer !important;
          appearance: none !important;
        }
        .swal-switch-wrapper {
          margin-top: 8px;
        }
        .swal-switch-container {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }
        .swal-switch-input {
          position: absolute !important;
          opacity: 0 !important;
          cursor: pointer !important;
        }
        .swal-switch-label {
          display: flex !important;
          align-items: center !important;
          gap: 10px !important;
          cursor: pointer !important;
        }
        .swal-switch-text {
          font-size: 13px !important;
          font-weight: 500 !important;
          color: #374151 !important;
        }
        .swal-switch-toggle {
          width: 40px;
          height: 20px;
          background: #d1d5db;
          border-radius: 20px;
          position: relative;
          cursor: pointer;
          transition: background 0.3s ease;
        }
        .swal-switch-toggle.active {
          background: #10b981;
        }
        .swal-switch-handle {
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 2px;
          left: 2px;
          transition: all 0.3s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .swal-switch-toggle.active .swal-switch-handle {
          transform: translateX(20px);
        }
        .swal-error-message {
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          font-size: 11px !important;
          color: #dc2626 !important;
          background: #fef2f2 !important;
          padding: 6px 10px !important;
          border-radius: 6px !important;
          border-left: 3px solid #ef4444 !important;
          margin-top: 4px !important;
        }
      </style>
      <div class="swal-form-container">
        <!-- Section: Informations Générales -->
        <div class="swal-form-section">
          <div class="swal-section-title">
            <i class="mdi mdi-information"></i>
            <h4>Informations Générales</h4>
          </div>
          <div class="swal-form-grid">
            <div class="swal-form-group">
              <label class="swal-form-label required">Nom Article</label>
              <div class="swal-input-wrapper">
                <input type="text" id="nom" class="swal-form-input" placeholder="Ex: ART001">
                <i class="mdi mdi-barcode swal-input-icon"></i>
              </div>
              <div id="nom-error" class="swal-error-message" style="display: none;"></div>
            </div>
          </div>
          <div class="swal-form-group swal-full-width">
            <label class="swal-form-label">Description</label>
            <div class="swal-textarea-wrapper">
              <textarea id="description" class="swal-form-textarea" placeholder="Description détaillée de l'article" rows="2"></textarea>
              <i class="mdi mdi-text-box swal-textarea-icon"></i>
            </div>
          </div>
        </div>

        <!-- Section: Classification -->
        <div class="swal-form-section">
          <div class="swal-section-title">
            <i class="mdi mdi-tag-multiple"></i>
            <h4>Classification</h4>
          </div>
          <div class="swal-form-grid">
            <div class="swal-form-group">
              <label class="swal-form-label required">Catégorie</label>
              <div class="swal-select-wrapper">
                <select id="categorie" class="swal-form-select">
                  <option value="">Sélectionner une catégorie</option>
                  <option value="VOLAILLES">VOLAILLES</option>
                  <option value="EMBALLAGES_ET_EPICES_ET_AUTRES">EMBALLAGES ET ÉPICES ET AUTRES</option>
                  ${this.categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                </select>
                <i class="mdi mdi-chevron-down swal-select-icon"></i>
              </div>
              <div id="categorie-error" class="swal-error-message" style="display: none;"></div>
            </div>
            <div class="swal-form-group">
              <label class="swal-form-label required">Unité</label>
              <div class="swal-select-wrapper">
                <select id="unite" class="swal-form-select">
                  <option value="">Sélectionner une unité</option>
                  <option value="Pièce">Pièce</option>
                  <option value="Kg">Kilogramme</option>
                  <option value="Litre">Litre</option>
                  <option value="Gramme">Mètre</option>

                </select>
                <i class="mdi mdi-chevron-down swal-select-icon"></i>
              </div>
              <div id="unite-error" class="swal-error-message" style="display: none;"></div>
            </div>
          </div>
        </div>

        <!-- Section: Prix et Stock -->
        <div class="swal-form-section">
          <div class="swal-section-title">
            <i class="mdi mdi-currency-usd"></i>
            <h4>Prix et Gestion de Stock</h4>
          </div>
          <div class="swal-form-grid swal-three-columns">
            <div class="swal-form-group">
              <label class="swal-form-label required">Prix Unitaire (MAD)</label>
              <div class="swal-input-wrapper">
                <input type="number" id="prixUnitaire" class="swal-form-input" min="0" step="0.01" placeholder="0.00">
                <i class="mdi mdi-currency-usd swal-input-icon"></i>
              </div>
              <div id="prixUnitaire-error" class="swal-error-message" style="display: none;"></div>
            </div>
            <div class="swal-form-group">
              <label class="swal-form-label required">Stock Minimum</label>
              <div class="swal-input-wrapper">
                <input type="number" id="stockMin" class="swal-form-input" min="0" placeholder="0">
                <i class="mdi mdi-trending-down swal-input-icon"></i>
              </div>
              <div id="stockMin-error" class="swal-error-message" style="display: none;"></div>
            </div>
            <div class="swal-form-group">
              <label class="swal-form-label required">Stock Maximum</label>
              <div class="swal-input-wrapper">
                <input type="number" id="stockMax" class="swal-form-input" min="0" placeholder="0">
                <i class="mdi mdi-trending-up swal-input-icon"></i>
              </div>
              <div id="stockMax-error" class="swal-error-message" style="display: none;"></div>
            </div>
          </div>
        </div>

        <!-- Section: Fournisseur et Statut - FIXED -->
        <div class="swal-form-section">
          <div class="swal-section-title">
            <i class="mdi mdi-account-group"></i>
            <h4>Fournisseur et Statut</h4>
          </div>
          <div class="swal-form-grid">
            <div class="swal-form-group">
              <label class="swal-form-label">Fournisseur</label>
              <div class="swal-select-wrapper">
                <select id="fournisseurPrincipalId" class="swal-form-select">
                  <option value="">Aucun fournisseur assigné</option>
                  ${this.fournisseurs.map(f => `<option value="${f.id}">${f.nom}</option>`).join('')}
                </select>
                <i class="mdi mdi-chevron-down swal-select-icon"></i>
              </div>
            </div>
            <div class="swal-form-group">
              <label class="swal-form-label">Statut</label>
              <div class="swal-switch-wrapper">
                <div class="swal-switch-container">
                  <input type="checkbox" id="actif" class="swal-switch-input" checked>
                  <label for="actif" class="swal-switch-label">
                    <div class="swal-switch-toggle active">
                      <div class="swal-switch-handle"></div>
                    </div>
                    <span class="swal-switch-text">Article actif</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: this.isEditMode ? 'Modifier' : 'Ajouter',
    cancelButtonText: 'Annuler',
    width: '800px',
    customClass: {
      popup: 'swal-custom-popup',
      confirmButton: 'swal-confirm-btn',
      cancelButton: 'swal-cancel-btn'
    },
    didOpen: () => {
      this.setupFormValidation();
      this.populateFormData();
    },
    preConfirm: () => {
      return this.validateAndGetFormData();
    }
  });

  if (formValues) {
    await this.saveArticleFromSwal(formValues);
  }
}
// Enhanced view details with perfect styling
async viewDetails(article: Article) {
  try {
    const response = await axios.get<ApiResponse<Article>>(`${this.apiUrl}/${article.id}`);

    if (response.data.success) {
      const details = response.data.data;
      const stockStatus = this.getStockStatus(details);
      const stockColor = this.stockColors[stockStatus];

      Swal.fire({
        title: `${details.nom}`,
        html: `
          <style>
            .swal-details-container {
              text-align: left;
              max-height: 60vh;
              overflow-y: auto;
            }
            .swal-details-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
              gap: 20px;
              margin-top: 20px;
            }
            .swal-detail-card {
              background: white;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 20px;
              transition: all 0.2s ease;
              position: relative;
              overflow: hidden;
            }
            .swal-detail-card::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 4px;
              background: var(--accent-gradient);
            }
            .swal-detail-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            }
            .swal-detail-card.primary {
              --accent-gradient: linear-gradient(135deg, #3b82f6, #2563eb);
            }
            .swal-detail-card.success {
              --accent-gradient: linear-gradient(135deg, #10b981, #059669);
            }
            .swal-detail-card.info {
              --accent-gradient: linear-gradient(135deg, #0ea5e9, #0284c7);
            }
            .swal-detail-header {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 16px;
              padding-bottom: 12px;
              border-bottom: 1px solid #f3f4f6;
            }
            .swal-detail-icon {
              width: 36px;
              height: 36px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: var(--accent-gradient);
              color: white;
              font-size: 16px;
            }
            .swal-detail-header h4 {
              font-size: 16px !important;
              font-weight: 600 !important;
              color: #1f2937 !important;
              margin: 0 !important;
            }
            .swal-detail-content {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }
            .swal-detail-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 10px 0;
              border-bottom: 1px solid #f9fafb;
            }
            .swal-detail-item:last-child {
              border-bottom: none;
            }
            .swal-detail-label {
              font-size: 13px !important;
              font-weight: 500 !important;
              color: #6b7280 !important;
            }
            .swal-detail-value {
              font-size: 13px !important;
              font-weight: 600 !important;
              color: #111827 !important;
              text-align: right !important;
            }
            .swal-detail-value.highlight {
              color: #2563eb !important;
            }
            .swal-detail-value.success {
              color: #059669 !important;
            }
            .swal-detail-value.warning {
              color: #d97706 !important;
            }
            .swal-detail-value.danger {
              color: #dc2626 !important;
            }
            .swal-detail-value.secondary {
              color: #6b7280 !important;
            }
            .swal-detail-value.info {
              color: #0284c7 !important;
            }
            .swal-details-popup {
              border-radius: 16px !important;
              box-shadow: 0 20px 40px rgba(0,0,0,0.15) !important;
              border: none !important;
            }
          </style>
          <div class="swal-details-container">
            <div class="swal-details-grid">
              <div class="swal-detail-card primary">
                <div class="swal-detail-header">
                  <div class="swal-detail-icon">
                    <i class="mdi mdi-information"></i>
                  </div>
                  <h4>Informations Générales</h4>
                </div>
                <div class="swal-detail-content">
                  <div class="swal-detail-item">
                    <span class="swal-detail-label">nom:</span>
                    <span class="swal-detail-value highlight">${details.nom}</span>
                  </div>
                  <div class="swal-detail-item">
                    <span class="swal-detail-label">Description:</span>
                    <span class="swal-detail-value">${details.description || 'N/A'}</span>
                  </div>
                  <div class="swal-detail-item">
                    <span class="swal-detail-label">Catégorie:</span>
                    <span class="swal-detail-value">${details.categorie}</span>
                  </div>
                  <div class="swal-detail-item">
                    <span class="swal-detail-label">Unité:</span>
                    <span class="swal-detail-value">${details.unite}</span>
                  </div>
                </div>
              </div>

              <div class="swal-detail-card success">
                <div class="swal-detail-header">
                  <div class="swal-detail-icon">
                    <i class="mdi mdi-currency-usd"></i>
                  </div>
                  <h4>Prix & Stock</h4>
                </div>
                <div class="swal-detail-content">
                  <div class="swal-detail-item">
                    <span class="swal-detail-label">Prix Unitaire:</span>
                    <span class="swal-detail-value highlight">${details.prixUnitaire} MAD</span>
                  </div>
                  <div class="swal-detail-item">
                    <span class="swal-detail-label">Stock Actuel:</span>
                    <span class="swal-detail-value ${stockColor}">${details.quantiteActuelle || 0}</span>
                  </div>
                  <div class="swal-detail-item">
                    <span class="swal-detail-label">Stock Min/Max:</span>
                    <span class="swal-detail-value">${details.stockMin} / ${details.stockMax}</span>
                  </div>
                  <div class="swal-detail-item">
                    <span class="swal-detail-label">Statut Stock:</span>
                    <span class="swal-detail-value ${stockColor}">${stockStatus.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              <div class="swal-detail-card info">
                <div class="swal-detail-header">
                  <div class="swal-detail-icon">
                    <i class="mdi mdi-account-group"></i>
                  </div>
                  <h4>Fournisseur & Statut</h4>
                </div>
                <div class="swal-detail-content">
                  <div class="swal-detail-item">
                    <span class="swal-detail-label">Fournisseur:</span>
                    <span class="swal-detail-value">${details.fournisseurPrincipalNom || 'Non assigné'}</span>
                  </div>
                  <div class="swal-detail-item">
                    <span class="swal-detail-label">Statut:</span>
                    <span class="swal-detail-value ${details.actif ? 'success' : 'secondary'}">${details.actif ? 'Actif' : 'Inactif'}</span>
                  </div>
                  <div class="swal-detail-item">
                    <span class="swal-detail-label">Créé le:</span>
                    <span class="swal-detail-value">${details.dateCreation ? new Date(details.dateCreation).toLocaleDateString('fr-FR') : 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `,
        icon: undefined,
        confirmButtonText: 'Fermer',
        confirmButtonColor: '#3b82f6',
        width: '700px',
        customClass: {
          popup: 'swal-details-popup'
        }
      });
    }
  } catch (error) {
    console.error('Error fetching details:', error);
    this.showError('Erreur lors du chargement des détails');
  }
}

// ADD THESE NEW HELPER METHODS

private setupFormValidation(): void {
  const inputs = ['nom', 'categorie', 'unite', 'prixUnitaire', 'stockMin', 'stockMax'];

  inputs.forEach(fieldName => {
    const element = document.getElementById(fieldName) as HTMLInputElement;
    if (element) {
      element.addEventListener('blur', () => this.validateField(fieldName));
      element.addEventListener('input', () => this.clearFieldError(fieldName));
    }
  });

  // Setup switch functionality
  const switchInput = document.getElementById('actif') as HTMLInputElement;
  const switchToggle = document.querySelector('.swal-switch-toggle') as HTMLElement;

  if (switchInput && switchToggle) {
    switchToggle.addEventListener('click', () => {
      switchInput.checked = !switchInput.checked;
      switchToggle.classList.toggle('active', switchInput.checked);
    });
  }
}
private populateFormData(): void {
  if (this.isEditMode && this.formData.value) {
    Object.keys(this.formData.value).forEach(key => {
      const element = document.getElementById(key) as HTMLInputElement;
      if (element) {
        if (element.type === 'checkbox') {
          element.checked = this.formData.value[key];
          const toggle = document.querySelector('.swal-switch-toggle') as HTMLElement;
          if (toggle) {
            toggle.classList.toggle('active', element.checked);
          }
        } else {
          element.value = this.formData.value[key] || '';
        }
      }
    });
  }
}
private validateField(fieldName: string): boolean {
  const element = document.getElementById(fieldName) as HTMLInputElement;
  const errorElement = document.getElementById(`${fieldName}-error`) as HTMLElement;

  if (!element || !errorElement) return true;

  let isValid = true;
  let errorMessage = '';

  switch (fieldName) {
    case 'nom':
    case 'designation':
      if (!element.value.trim()) {
        isValid = false;
        errorMessage = `${fieldName === 'nom' ? 'Le nom' : 'La désignation'} est obligatoire.`;
      } else if (element.value.trim().length < 2) {
        isValid = false;
        errorMessage = `${fieldName === 'nom' ? 'Le nom' : 'La désignation'} doit contenir au moins 2 caractères.`;
      }
      break;

    case 'categorie':
    case 'unite':
      if (!element.value) {
        isValid = false;
        errorMessage = `${fieldName === 'categorie' ? 'La catégorie' : 'L\'unité'} est obligatoire.`;
      }
      break;

    case 'prixUnitaire':
    case 'stockMin':
    case 'stockMax':
      if (!element.value || parseFloat(element.value) < 0) {
        isValid = false;
        errorMessage = `${this.getFieldLabel(fieldName)} est obligatoire et doit être positif.`;
      }
      break;
  }

  if (!isValid) {
    errorElement.innerHTML = `<i class="mdi mdi-alert-circle"></i> ${errorMessage}`;
    errorElement.style.display = 'flex';
    element.classList.add('error');
  } else {
    errorElement.style.display = 'none';
    element.classList.remove('error');
  }

  return isValid;
}

private clearFieldError(fieldName: string): void {
  const errorElement = document.getElementById(`${fieldName}-error`) as HTMLElement;
  const element = document.getElementById(fieldName) as HTMLInputElement;

  if (errorElement && element) {
    errorElement.style.display = 'none';
    element.classList.remove('error');
  }
}

private getFieldLabel(fieldName: string): string {
  const labels = {
    'prixUnitaire': 'Le prix unitaire',
    'stockMin': 'Le stock minimum',
    'stockMax': 'Le stock maximum'
  };
  return labels[fieldName] || fieldName;
}

private validateAndGetFormData(): any {
  const requiredFields = ['nom', 'categorie', 'unite', 'prixUnitaire', 'stockMin', 'stockMax'];
  let isValid = true;

  // Validate all required fields
  requiredFields.forEach(field => {
    if (!this.validateField(field)) {
      isValid = false;
    }
  });

  if (!isValid) {
    Swal.showValidationMessage('Veuillez corriger les erreurs dans le formulaire');
    return false;
  }

  // Collect form data
  const formData: any = {};

  // Get basic fields
  ['nom', 'description', 'categorie', 'unite', 'prixUnitaire', 'stockMin', 'stockMax'].forEach(field => {
    const element = document.getElementById(field) as HTMLInputElement;
    if (element) {
      if (element.type === 'number') {
        formData[field] = element.value ? parseFloat(element.value) : 0;
      } else {
        formData[field] = element.value || '';
      }
    }
  });

  // FIXED: Get supplier with correct field name
  const fournisseurElement = document.getElementById('fournisseurPrincipalId') as HTMLInputElement;
  if (fournisseurElement && fournisseurElement.value) {
    formData.fournisseurPrincipalId = parseInt(fournisseurElement.value);
  } else {
    formData.fournisseurPrincipalId = null;
  }

  const actifElement = document.getElementById('actif') as HTMLInputElement;
  formData.actif = actifElement ? actifElement.checked : true;

  return formData;
}
private async saveArticleFromSwal(formValues: any): Promise<void> {
  this.loading = true;

  try {
    let response: any;

    if (this.selectedArticleId) {
      response = await axios.put<ApiResponse<Article>>(
        `${this.apiUrl}/${this.selectedArticleId}`,
        formValues
      );
      Swal.fire('Succès!', 'Article modifié avec succès.', 'success');
    } else {
      response = await axios.post<ApiResponse<Article>>(
        this.apiUrl,
        formValues
      );
      Swal.fire('Succès!', 'Article ajouté avec succès.', 'success');
    }

    this.fetchArticles();
    this.loadStatistics();

  } catch (error: any) {
    console.error('Error saving article:', error);
    const errorMessage = error.response?.data?.message || 'Erreur lors de la sauvegarde';
    this.showError(errorMessage);
  } finally {
    this.loading = false;
  }
}
}
