import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import axios from 'axios';
import Swal from 'sweetalert2';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { Router } from '@angular/router';

interface Fournisseur {
  id?: number;
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
  ville: string;
  pays: string;
  codePostal?: string;
  conditionsPaiement?: string;
  delaiLivraison?: number;
  actif?: boolean;
  dateCreation?: string;
  dateModification?: string;
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
  selector: 'app-fournisseurs',
  templateUrl: './fournisseurs.component.html',
  styleUrls: ['./fournisseurs.component.scss']
})
export class FournisseursComponent implements OnInit {
  fournisseurs: Fournisseur[] = [];
  allFournisseurs: Fournisseur[] = [];
  formData: FormGroup;
  searchForm: FormGroup;
  submitted = false;
  term: string = '';
  modalRef?: BsModalRef;
  selectedFournisseurId?: number;
  isEditMode = false;
  loading = false;

  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  // Filters
  selectedVille = '';
  selectedPays = '';
  selectedStatus = '';
  villes: string[] = [];
  pays: string[] = [];

  // Statistics
  statistics = {
    total: 0,
    actifs: 0,
    inactifs: 0,
    villes: 0,
    pays: 0
  };

  private apiUrl = 'http://localhost:8090/api/fournisseurs';

  constructor(
    private modalService: BsModalService,
    private formBuilder: FormBuilder,
    private router: Router
  ) {
    this.initForms();
  }

  ngOnInit(): void {
    this.fetchFournisseurs();
    this.loadReferenceData();
    this.loadStatistics();
  }

  initForms() {
    this.formData = this.formBuilder.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.required]],
      adresse: ['', [Validators.required]],
      ville: ['', [Validators.required]],
      pays: ['', [Validators.required]],
      codePostal: [''],
      conditionsPaiement: [''],
      delaiLivraison: [0, [Validators.min(0)]],
      actif: [true]
    });

    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      ville: [''],
      pays: [''],
      status: [''],
      delaiMax: ['']
    });
  }

  // ========================
  // CRUD OPERATIONS
  // ========================

  async fetchFournisseurs() {
    this.loading = true;
    try {
      const response = await axios.get<ApiResponse<PagedResponse<Fournisseur>>>(
        `${this.apiUrl}?page=${this.currentPage}&size=${this.pageSize}&sortBy=nom&sortDirection=ASC`
      );

      if (response.data.success) {
        this.fournisseurs = response.data.data.content;
        this.totalElements = response.data.data.totalElements;
        this.totalPages = response.data.data.totalPages;
        this.allFournisseurs = [...this.fournisseurs];
      }
    } catch (error) {
      console.error('Error fetching fournisseurs:', error);
      this.showError('Erreur lors du chargement des fournisseurs');
    } finally {
      this.loading = false;
    }
  }

  async saveFournisseur() {
    this.submitted = true;
    if (this.formData.invalid) return;

    const fournisseurData: Fournisseur = this.formData.value;
    this.loading = true;

    try {
      let response: any;

      if (this.selectedFournisseurId) {
        // Update existing fournisseur
        response = await axios.put<ApiResponse<Fournisseur>>(
          `${this.apiUrl}/${this.selectedFournisseurId}`,
          fournisseurData
        );
        Swal.fire('Succès!', 'Fournisseur modifié avec succès.', 'success');
      } else {
        // Create new fournisseur
        response = await axios.post<ApiResponse<Fournisseur>>(
          this.apiUrl,
          fournisseurData
        );
        Swal.fire('Succès!', 'Fournisseur ajouté avec succès.', 'success');
      }

      this.fetchFournisseurs();
      this.loadStatistics();
      this.modalRef?.hide();
      this.resetForm();

    } catch (error: any) {
      console.error('Error saving fournisseur:', error);
      const errorMessage = error.response?.data?.message || 'Erreur lors de la sauvegarde';
      this.showError(errorMessage);
    } finally {
      this.loading = false;
    }
  }

  async deleteFournisseur(id: number) {
    const result = await Swal.fire({
      title: 'Êtes-vous sûr?',
      text: 'Cette action va désactiver le fournisseur.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, désactiver!',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#d33'
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`${this.apiUrl}/${id}`);
        this.fetchFournisseurs();
        this.loadStatistics();
        Swal.fire('Désactivé!', 'Le fournisseur a été désactivé.', 'success');
      } catch (error) {
        console.error('Error deleting fournisseur:', error);
        this.showError('Erreur lors de la suppression');
      }
    }
  }

  async reactivateFournisseur(id: number) {
    try {
      await axios.put(`${this.apiUrl}/${id}/reactivate`);
      this.fetchFournisseurs();
      this.loadStatistics();
      Swal.fire('Réactivé!', 'Le fournisseur a été réactivé.', 'success');
    } catch (error) {
      console.error('Error reactivating fournisseur:', error);
      this.showError('Erreur lors de la réactivation');
    }
  }

  async duplicateFournisseur(id: number) {
    const { value: formValues } = await Swal.fire({
      title: 'Dupliquer le fournisseur',
      html: `
        <input id="newCode" class="swal2-input" placeholder="Nouveau code" required>
        <input id="newNom" class="swal2-input" placeholder="Nouveau nom" required>
      `,
      focusConfirm: false,
      preConfirm: () => {
        const newCode = (document.getElementById('newCode') as HTMLInputElement).value;
        const newNom = (document.getElementById('newNom') as HTMLInputElement).value;

        if (!newCode || !newNom) {
          Swal.showValidationMessage('Veuillez remplir tous les champs');
          return false;
        }

        return { newCode, newNom };
      }
    });

    if (formValues) {
      try {
        await axios.post(`${this.apiUrl}/${id}/duplicate?newCode=${formValues.newCode}&newNom=${formValues.newNom}`);
        this.fetchFournisseurs();
        this.loadStatistics();
        Swal.fire('Dupliqué!', 'Fournisseur dupliqué avec succès.', 'success');
      } catch (error) {
        console.error('Error duplicating fournisseur:', error);
        this.showError('Erreur lors de la duplication');
      }
    }
  }

  // ========================
  // MODAL OPERATIONS
  // ========================

  openModal(content: any, fournisseur?: Fournisseur) {
    this.submitted = false;
    this.modalRef = this.modalService.show(content, { class: 'modal-lg' });

    if (fournisseur) {
      this.isEditMode = true;
      this.selectedFournisseurId = fournisseur.id;
      this.formData.patchValue(fournisseur);
    } else {
      this.isEditMode = false;
      this.resetForm();
    }
  }

  resetForm() {
    this.formData.reset();
    this.selectedFournisseurId = undefined;
    this.submitted = false;
    this.isEditMode = false;
    this.formData.patchValue({ actif: true, delaiLivraison: 0 });
  }

  // ========================
  // SEARCH & FILTER
  // ========================

  async performSearch() {
    if (!this.term.trim()) {
      this.fournisseurs = [...this.allFournisseurs];
      return;
    }

    this.loading = true;
    try {
      const response = await axios.get<ApiResponse<PagedResponse<Fournisseur>>>(
        `${this.apiUrl}/search?q=${encodeURIComponent(this.term)}&page=0&size=50`
      );

      if (response.data.success) {
        this.fournisseurs = response.data.data.content;
      }
    } catch (error) {
      console.error('Error searching fournisseurs:', error);
      this.showError('Erreur lors de la recherche');
    } finally {
      this.loading = false;
    }
  }

  async applyFilters() {
    const filters = this.searchForm.value;
    let filteredData = [...this.allFournisseurs];

    // Apply client-side filters
    if (filters.ville) {
      filteredData = filteredData.filter(f => f.ville === filters.ville);
    }

    if (filters.pays) {
      filteredData = filteredData.filter(f => f.pays === filters.pays);
    }

    if (filters.status !== '') {
      const isActive = filters.status === 'true';
      filteredData = filteredData.filter(f => f.actif === isActive);
    }

    if (filters.delaiMax) {
      filteredData = filteredData.filter(f => (f.delaiLivraison || 0) <= filters.delaiMax);
    }

    this.fournisseurs = filteredData;
  }

  clearFilters() {
    this.searchForm.reset();
    this.term = '';
    this.fournisseurs = [...this.allFournisseurs];
  }

  // ========================
  // REFERENCE DATA
  // ========================

  async loadReferenceData() {
    try {
      const [villesResponse, paysResponse] = await Promise.all([
        axios.get<ApiResponse<string[]>>(`${this.apiUrl}/reference/cities`),
        axios.get<ApiResponse<string[]>>(`${this.apiUrl}/reference/countries`)
      ]);

      if (villesResponse.data.success) {
        this.villes = villesResponse.data.data;
      }

      if (paysResponse.data.success) {
        this.pays = paysResponse.data.data;
      }
    } catch (error) {
      console.error('Error loading reference data:', error);
    }
  }

  async loadStatistics() {
    try {
      const [actifsResponse, inactifsResponse] = await Promise.all([
        axios.get<ApiResponse<number>>(`${this.apiUrl}/stats/count-by-status?actif=true`),
        axios.get<ApiResponse<number>>(`${this.apiUrl}/stats/count-by-status?actif=false`)
      ]);

      if (actifsResponse.data.success && inactifsResponse.data.success) {
        this.statistics.actifs = actifsResponse.data.data;
        this.statistics.inactifs = inactifsResponse.data.data;
        this.statistics.total = this.statistics.actifs + this.statistics.inactifs;
        this.statistics.villes = this.villes.length;
        this.statistics.pays = this.pays.length;
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  }

  // ========================
  // PAGINATION
  // ========================

  goToPage(page: number) {
    this.currentPage = page;
    this.fetchFournisseurs();
  }

  changePageSize(size: number) {
    this.pageSize = size;
    this.currentPage = 0;
    this.fetchFournisseurs();
  }

  // ========================
  // UTILITIES
  // ========================

  showError(message: string) {
    Swal.fire('Erreur!', message, 'error');
  }

  async checkCodeExists(code: string): Promise<boolean> {
    if (!code) return false;

    try {
      const response = await axios.get<ApiResponse<boolean>>(`${this.apiUrl}/exists/code/${code}`);
      return response.data.success ? response.data.data : false;
    } catch (error) {
      return false;
    }
  }

  async validateContactInfo(id: number): Promise<boolean> {
    try {
      const response = await axios.get<ApiResponse<boolean>>(`${this.apiUrl}/${id}/validate-contact`);
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
      const response = await axios.get<ApiResponse<any>>(`${this.apiUrl}/dashboard`);
      if (response.data.success) {
        console.log('Dashboard data:', response.data.data);
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
    return this.fournisseurs.length > 0;
  }

  get filteredCount(): number {
    return this.fournisseurs.length;
  }
}