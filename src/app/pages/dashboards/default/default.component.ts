import { Component, OnInit } from '@angular/core';
import axios from 'axios';
import * as echarts from 'echarts';

@Component({
  selector: 'app-default',
  templateUrl: './default.component.html',
  styleUrls: ['./default.component.scss']
})
export class DefaultComponent implements OnInit {
  // Variables pour les statistiques principales
  totalArticles = 0;
  totalStockValue = 0;
  stocksCritiques = 0;
  stocksFaibles = 0;
  stocksVides = 0;
  stocksExcessifs = 0;
  nombreFournisseurs = 0;
  mouvementsAujourdhui = 0;

  // Variables pour les données des graphiques
  stockByCategory: any[] = [];
  movementsTrend: any[] = [];
  topConsumedArticles: any[] = [];
  stockValueEvolution: any[] = [];
  supplierPerformance: any[] = [];
  generalStats: any = {};

  private readonly BASE_URL = 'http://localhost:8090/api';

  constructor() {}

  ngOnInit() {
    this.initializeDashboard();
  }

  async initializeDashboard() {
    try {
      // Charger toutes les données en parallèle pour de meilleures performances
      await Promise.all([
        this.fetchGeneralStatistics(),
        this.fetchStockAlerts(),
        this.fetchChartData(),
        this.fetchSupplierCount(),
        this.fetchTodayMovements()
      ]);

      // Créer tous les graphiques après le chargement des données
      this.createAllCharts();

    } catch (error) {
      console.error('Erreur lors de l\'initialisation du dashboard:', error);
    }
  }

  // ===============================
  // MÉTHODES DE RÉCUPÉRATION DES DONNÉES
  // ===============================

  private async fetchGeneralStatistics() {
    try {
      const response = await axios.get(`${this.BASE_URL}/dashboard/stats/general`);
      if (response.data && response.data.success) {
        this.generalStats = response.data.data;
        this.totalArticles = this.generalStats.nombreTotalArticles || 0;
        this.totalStockValue = this.generalStats.valeurTotaleStock || 0;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques générales:', error);
    }
  }

  private async fetchStockAlerts() {
    try {
      // Stocks critiques
      const criticalResponse = await axios.get(`${this.BASE_URL}/stocks/alerts/critical`);
      if (criticalResponse.data && criticalResponse.data.success) {
        this.stocksCritiques = criticalResponse.data.data.length;
      }

      // Stocks faibles
      const lowResponse = await axios.get(`${this.BASE_URL}/stocks/alerts/low`);
      if (lowResponse.data && lowResponse.data.success) {
        this.stocksFaibles = lowResponse.data.data.length;
      }

      // Stocks vides
      const emptyResponse = await axios.get(`${this.BASE_URL}/stocks/alerts/empty`);
      if (emptyResponse.data && emptyResponse.data.success) {
        this.stocksVides = emptyResponse.data.data.length;
      }

      // Stocks excessifs
      const excessiveResponse = await axios.get(`${this.BASE_URL}/stocks/alerts/excessive`);
      if (excessiveResponse.data && excessiveResponse.data.success) {
        this.stocksExcessifs = excessiveResponse.data.data.length;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des alertes de stock:', error);
    }
  }

  private async fetchChartData() {
    try {
      // Stock par catégorie
      const categoryResponse = await axios.get(`${this.BASE_URL}/dashboard/charts/stock-by-category`);
      if (categoryResponse.data && categoryResponse.data.success) {
        this.stockByCategory = categoryResponse.data.data;
      }

      // Tendance des mouvements (7 jours)
      const trendResponse = await axios.get(`${this.BASE_URL}/dashboard/charts/movements-trend?days=7`);
      if (trendResponse.data && trendResponse.data.success) {
        this.movementsTrend = trendResponse.data.data;
      }

      // Top articles consommés (30 jours)
      const topArticlesResponse = await axios.get(`${this.BASE_URL}/dashboard/charts/top-consumed-articles?days=30&limit=10`);
      if (topArticlesResponse.data && topArticlesResponse.data.success) {
        this.topConsumedArticles = topArticlesResponse.data.data;
      }

      // Évolution de la valeur du stock (30 jours)
      const stockEvolutionResponse = await axios.get(`${this.BASE_URL}/dashboard/charts/stock-value-evolution?days=30`);
      if (stockEvolutionResponse.data && stockEvolutionResponse.data.success) {
        this.stockValueEvolution = stockEvolutionResponse.data.data;
      }

      // Performance des fournisseurs
      const supplierPerformanceResponse = await axios.get(`${this.BASE_URL}/dashboard/stats/supplier-performance?days=365&limit=10`);
      if (supplierPerformanceResponse.data && supplierPerformanceResponse.data.success) {
        this.supplierPerformance = supplierPerformanceResponse.data.data;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données de graphiques:', error);
    }
  }

  private async fetchSupplierCount() {
    try {
      const response = await axios.get(`${this.BASE_URL}/fournisseurs/stats/count-by-status?actif=true`);
      if (response.data && response.data.success) {
        this.nombreFournisseurs = response.data.data;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du nombre de fournisseurs:', error);
    }
  }

  private async fetchTodayMovements() {
    try {
      const response = await axios.get(`${this.BASE_URL}/dashboard/stats/today-movements`);
      if (response.data && response.data.success) {
        this.mouvementsAujourdhui = response.data.data.totalMouvements || 0;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des mouvements d\'aujourd\'hui:', error);
    }
  }

  // ===============================
  // MÉTHODES DE CRÉATION DES GRAPHIQUES
  // ===============================

  private createAllCharts() {
    setTimeout(() => {
      this.createStockByCategoryChart();
      this.createMovementsTrendChart();
      this.createTopConsumedArticlesChart();
      this.createStockValueEvolutionChart();
      this.createStockAlertsChart();
      this.createSupplierPerformanceChart();
    }, 100);
  }

  private createStockByCategoryChart() {
    const chartContainer = document.querySelector("#stockByCategoryChart") as HTMLDivElement;
    if (!chartContainer || !this.stockByCategory.length) return;

    const chart = echarts.init(chartContainer);
    const options = {
      title: {
        text: 'Répartition du Stock par Catégorie',
        left: 'center',
        textStyle: {
          fontSize: 18,
          fontWeight: 'bold',
          color: '#333'
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b} : {c} articles ({d}%)'
      },
      legend: {
        orient: 'horizontal',
        bottom: '5%',
        textStyle: {
          fontSize: 12,
          color: '#666'
        }
      },
      series: [{
        name: 'Stock par Catégorie',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: '{b}: {c}'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        data: this.stockByCategory.map(item => ({
          value: item.value,
          name: item.label,
          itemStyle: { color: this.generateRandomColor() }
        }))
      }]
    };

    chart.setOption(options);
    this.handleChartResponsiveness(chart);
  }

  private createMovementsTrendChart() {
    const chartContainer = document.querySelector("#movementsTrendChart") as HTMLDivElement;
    if (!chartContainer || !this.movementsTrend.length) return;

    const chart = echarts.init(chartContainer);
    const dates = this.movementsTrend.map(item => item.label);
    const values = this.movementsTrend.map(item => item.value);

    const options = {
      title: {
        text: 'Tendance des Mouvements (7 derniers jours)',
        left: 'center',
        textStyle: {
          fontSize: 18,
          fontWeight: 'bold',
          color: '#333'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: {
          lineStyle: { color: '#888' }
        }
      },
      yAxis: {
        type: 'value',
        axisLine: {
          lineStyle: { color: '#888' }
        },
        splitLine: {
          lineStyle: { type: 'dashed', color: '#ccc' }
        }
      },
      series: [{
        name: 'Mouvements',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        data: values,
        itemStyle: { color: '#44e0eb' },
        lineStyle: { width: 3 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(68, 224, 235, 0.3)' },
              { offset: 1, color: 'rgba(68, 224, 235, 0.05)' }
            ]
          }
        }
      }]
    };

    chart.setOption(options);
    this.handleChartResponsiveness(chart);
  }

  private createTopConsumedArticlesChart() {
    const chartContainer = document.querySelector("#topConsumedChart") as HTMLDivElement;
    if (!chartContainer || !this.topConsumedArticles.length) return;

    const chart = echarts.init(chartContainer);
    const articleNames = this.topConsumedArticles.map(item => item.label);
    const consumedQuantities = this.topConsumedArticles.map(item => item.value);

    const options = {
      title: {
        text: 'Top 10 Articles les Plus Consommés (30 jours)',
        left: 'center',
        textStyle: {
          fontSize: 18,
          fontWeight: 'bold',
          color: '#333'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: articleNames,
        axisLabel: {
          interval: 0,
          rotate: 45,
          textStyle: { fontSize: 12 }
        },
        axisLine: {
          lineStyle: { color: '#888' }
        }
      },
      yAxis: {
        type: 'value',
        axisLine: {
          lineStyle: { color: '#888' }
        },
        splitLine: {
          lineStyle: { type: 'dashed', color: '#ccc' }
        }
      },
      series: [{
        name: 'Quantité Consommée',
        type: 'bar',
        barWidth: '60%',
        data: consumedQuantities,
        itemStyle: {
          color: '#F43F5E',
          borderRadius: [5, 5, 0, 0]
        }
      }]
    };

    chart.setOption(options);
    this.handleChartResponsiveness(chart);
  }

  private createStockValueEvolutionChart() {
    const chartContainer = document.querySelector("#stockValueEvolutionChart") as HTMLDivElement;
    if (!chartContainer || !this.stockValueEvolution.length) return;

    const chart = echarts.init(chartContainer);
    const dates = this.stockValueEvolution.map(item => item.label);
    const values = this.stockValueEvolution.map(item => item.value);

    const options = {
      title: {
        text: 'Évolution de la Valeur du Stock (30 jours)',
        left: 'center',
        textStyle: {
          fontSize: 18,
          fontWeight: 'bold',
          color: '#333'
        }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const value = params[0].value;
          return `${params[0].axisValue}<br/>Valeur: ${value.toLocaleString()} MAD`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: {
          lineStyle: { color: '#888' }
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: '{value} MAD'
        },
        axisLine: {
          lineStyle: { color: '#888' }
        },
        splitLine: {
          lineStyle: { type: 'dashed', color: '#ccc' }
        }
      },
      series: [{
        name: 'Valeur du Stock',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: values,
        itemStyle: { color: '#46e5e5' },
        lineStyle: { width: 3 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(70, 229, 229, 0.3)' },
              { offset: 1, color: 'rgba(70, 229, 229, 0.05)' }
            ]
          }
        }
      }]
    };

    chart.setOption(options);
    this.handleChartResponsiveness(chart);
  }

  private createStockAlertsChart() {
    const chartContainer = document.querySelector("#stockAlertsChart") as HTMLDivElement;
    if (!chartContainer) return;

    const chart = echarts.init(chartContainer);
    const alertData = [
      { value: this.stocksCritiques, name: 'Stocks Critiques', itemStyle: { color: '#ff4757' } },
      { value: this.stocksFaibles, name: 'Stocks Faibles', itemStyle: { color: '#ffa502' } },
      { value: this.stocksVides, name: 'Stocks Vides', itemStyle: { color: '#ff6b6b' } },
      { value: this.stocksExcessifs, name: 'Stocks Excessifs', itemStyle: { color: '#3742fa' } }
    ];

    const options = {
      title: {
        text: 'Alertes de Stock',
        left: 'center',
        textStyle: {
          fontSize: 18,
          fontWeight: 'bold',
          color: '#333'
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b} : {c} articles ({d}%)'
      },
      legend: {
        orient: 'horizontal',
        bottom: '5%',
        textStyle: {
          fontSize: 12,
          color: '#666'
        }
      },
      series: [{
        name: 'Alertes de Stock',
        type: 'pie',
        radius: ['30%', '60%'],
        center: ['50%', '50%'],
        data: alertData,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: '{b}: {c}'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold'
          }
        }
      }]
    };

    chart.setOption(options);
    this.handleChartResponsiveness(chart);
  }

  private createSupplierPerformanceChart() {
    const chartContainer = document.querySelector("#supplierPerformanceChart") as HTMLDivElement;
    if (!chartContainer || !this.supplierPerformance.length) return;

    const chart = echarts.init(chartContainer);

    // Traitement des données fournisseurs
    const suppliers = this.supplierPerformance.map((supplier: any) => supplier.nomFournisseur || supplier.nom || 'Fournisseur');
    const performances = this.supplierPerformance.map((supplier: any) => supplier.performance || supplier.valeur || 0);

    const options = {
      title: {
        text: 'Performance des Fournisseurs (Top 10)',
        left: 'center',
        textStyle: {
          fontSize: 18,
          fontWeight: 'bold',
          color: '#333'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: suppliers,
        axisLabel: {
          interval: 0,
          rotate: 45,
          textStyle: { fontSize: 12 }
        },
        axisLine: {
          lineStyle: { color: '#888' }
        }
      },
      yAxis: {
        type: 'value',
        axisLine: {
          lineStyle: { color: '#888' }
        },
        splitLine: {
          lineStyle: { type: 'dashed', color: '#ccc' }
        }
      },
      series: [{
        name: 'Performance',
        type: 'bar',
        barWidth: '60%',
        data: performances,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#44e0eb' },
              { offset: 1, color: '#46e5e5' }
            ]
          },
          borderRadius: [5, 5, 0, 0]
        }
      }]
    };

    chart.setOption(options);
    this.handleChartResponsiveness(chart);
  }

  // ===============================
  // MÉTHODES UTILITAIRES
  // ===============================

  private generateRandomColor(): string {
    const colors = [
      '#44e0eb', '#F43F5E', '#46e5e5', '#737373',
      '#ff4757', '#ffa502', '#3742fa', '#2ed573',
      '#5352ed', '#ff3838', '#ff9ff3', '#54a0ff'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private handleChartResponsiveness(chart: echarts.ECharts) {
    let resizeTimeout: any;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        chart.resize();
      }, 250);
    };

    window.addEventListener('resize', handleResize);

    const observer = new ResizeObserver(handleResize);
    const container = chart.getDom();
    if (container) {
      observer.observe(container);
    }
  }

  // ===============================
  // MÉTHODES D'ACTUALISATION
  // ===============================

  async refreshDashboard() {
    try {
      console.log('Actualisation du dashboard en cours...');
      await this.initializeDashboard();
      console.log('Dashboard actualisé avec succès !');
    } catch (error) {
      console.error('Erreur lors de l\'actualisation du dashboard:', error);
    }
  }

  // Getters pour les pourcentages et calculs
  get criticalStockPercentage(): number {
    return this.totalArticles > 0 ? (this.stocksCritiques / this.totalArticles) * 100 : 0;
  }

  get lowStockPercentage(): number {
    return this.totalArticles > 0 ? (this.stocksFaibles / this.totalArticles) * 100 : 0;
  }

  get stockHealthScore(): string {
    const totalProblems = this.stocksCritiques + this.stocksFaibles + this.stocksVides;
    if (totalProblems === 0) return 'Excellent';
    if (totalProblems < 10) return 'Bon';
    if (totalProblems < 25) return 'Moyen';
    return 'Critique';
  }

  get formattedStockValue(): string {
    return this.totalStockValue.toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 2
    });
  }
}