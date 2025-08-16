import { Component, OnInit } from '@angular/core';
import axios from 'axios';
import * as echarts from 'echarts';

@Component({
  selector: 'app-default',
  templateUrl: './default.component.html',
  styleUrls: ['./default.component.scss']
})
export class DefaultComponent implements OnInit {
  totalOrders = 0;
  totalGlobalAmount = 0;
  totalPaid = 0;

  constructor() {}

  ngOnInit() {
    this.fetchData();
    this.fetchTotalOrders();
    this.fetchTotalGlobalAmount();
    this.fetchTotalPaid();

  }

  async fetchData() {
    try {
      const allOrdersResponse = await axios.get('http://localhost:8044/api/orders');
      const orders = allOrdersResponse.data;

      this.calculateTotals(orders);
      this.createCharts(orders);
      this.createCategoryChart(orders); // Add this line to create the new category chart
      this.createProductPopularityChart(orders); // Add this line
      await this.fetchCustomerData();
    } catch (error) {
      console.error('Error fetching data', error);
    }
  }



  private async fetchTotalOrders() {
    try {
      const response = await axios.get('http://localhost:8044/api/orders/total-count');
      this.totalOrders = response.data;
    } catch (error) {
      console.error('Error fetching total orders', error);
    }
  }

  private async fetchTotalGlobalAmount() {
    try {
      const response = await axios.get('http://localhost:8044/api/orders/total-global-amount');
      this.totalGlobalAmount = response.data;
    } catch (error) {
      console.error('Error fetching total global amount', error);
    }
  }

  private async fetchTotalPaid() {
    try {
      const response = await axios.get('http://localhost:8044/api/orders/total-amount-paid');
      this.totalPaid = response.data;
    } catch (error) {
      console.error('Error fetching total paid amount', error);
    }
  }

  private async fetchCustomerData() {
    try {
      const customerResponse = await axios.get('http://localhost:8044/api/customers/all');
      const customers = customerResponse.data;
      this.createCustomerChart(customers);
    } catch (error) {
      console.error('Error fetching customer data', error);
    }
  }

  private calculateTotals(orders: any[]) {
    this.totalOrders = orders.length;
    this.totalGlobalAmount = orders.reduce((acc, order) => acc + order.totalAmount, 0);
    this.totalPaid = orders.reduce((acc, order) => acc + order.amountPaid, 0);
  }

  private createCharts(orders: any[]) {
    const paidOrders = orders.filter(order => order.invoiceStatus === 'Paid').length;
    const unpaidOrders = orders.filter(order => order.invoiceStatus === 'Unpaid').length;

    const totalAmount = orders.reduce((acc, order) => acc + order.totalAmount, 0);
    const remainingAmount = totalAmount - this.totalPaid;

    // Chart 1: Order Payment Status
    const orderStatusChart = echarts.init(document.querySelector("#orderStatusChart"));
    const orderStatusOptions = {
      title: {
        text: 'Statut de Paiement des Commandes',
        left: 'center'
      },
      tooltip: {
        trigger: 'item'
      },
      legend: {
        orient: 'horizontal',
        bottom: '10%'
      },
      series: [
        {
          name: 'Commandes',
          type: 'pie',
          radius: ['35%', '55%'],
          avoidLabelOverlap: false,
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '16',
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: [
            { value: paidOrders, name: 'Commandes Payées', itemStyle: { color: '#00c853' } },
            { value: unpaidOrders, name: 'Commandes Non Payées', itemStyle: { color: '#ff1744' } }
          ]
        }
      ]
    };
    orderStatusChart.setOption(orderStatusOptions);

    // Chart 2: Total Amount vs. Remaining Amount
    const amountBreakdownChart = echarts.init(document.querySelector("#amountBreakdownChart"));
    const amountBreakdownOptions = {
      title: {
        text: 'Répartition des Montants',
        left: 'center'
      },
      tooltip: {
        trigger: 'item'
      },
      legend: {
        orient: 'horizontal',
        bottom: '10%'
      },
      series: [
        {
          name: 'Montant',
          type: 'pie',
          radius: ['35%', '55%'],
          avoidLabelOverlap: false,
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '16',
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: [
            { value: this.totalPaid, name: 'Total Payé', itemStyle: { color: '#2196f3' } },
            { value: remainingAmount, name: 'Montant Restant', itemStyle: { color: '#ffca28' } }
          ]
        }
      ]
    };
    amountBreakdownChart.setOption(amountBreakdownOptions);
  }

  private createCustomerChart(customers: any[]) {
    const customerNames = customers.map(customer => customer.name);
    const paidAmounts = customers.map(customer => customer.orders.reduce((acc, order) => acc + order.amountPaid, 0));
    const unpaidAmounts = customers.map(customer => customer.orders.reduce((acc, order) => acc + order.remainingAmount, 0));

    const customerChart = echarts.init(document.querySelector("#monthlySalesChart"));
    const customerChartOptions = {
      title: {
        text: 'Montant des Clients - Payé vs Non Payé',
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
          type: 'shadow'
        }
      },
      legend: {
        data: ['Montant Payé', 'Montant Non Payé'],
        bottom: '5%',
        textStyle: {
          fontSize: 14,
          color: '#666'
        }
      },
      grid: {
        left: '4%',
        right: '5%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: customerNames,
        axisLabel: {
          interval: 0,
          rotate: 30,
          textStyle: {
            fontSize: 12
          }
        },
        axisLine: {
          lineStyle: {
            color: '#888'
          }
        }
      },
      yAxis: {
        type: 'value',
        axisLine: {
          lineStyle: {
            color: '#888'
          }
        },
        splitLine: {
          lineStyle: {
            type: 'dashed',
            color: '#ccc'
          }
        }
      },
      series: [
        {
          name: 'Montant Payé',
          type: 'bar',
          barWidth: '10%',
          stack: 'total',
          data: paidAmounts,
          itemStyle: {
            color: '#00c853',
            borderRadius: [5, 4, 0, 0]
          }
        },
        {
          name: 'Montant Non Payé',
          type: 'bar',
          barWidth: '10%',
          stack: 'total',
          data: unpaidAmounts,
          itemStyle: {
            color: '#ff1744',
            borderRadius: [5, 4, 0, 0]
          }
        }
      ]
    };
    customerChart.setOption(customerChartOptions);

    // Now create the additional chart for categories
    this.createCategoryChart(customers);
  }
  private createCategoryChart(orders: any[]) {
    // Step 1: Initialize count totals for each category
    const categoryCounts = {
      Alimentaire: 0,
      Cosmetique: 0,
      Argan: 0
    };

    // Step 2: Iterate through orders to calculate counts for each category
    orders.forEach(order => {
      order.orderProducts.forEach(orderProduct => {
        const category = orderProduct.product.category;
        const productCount = orderProduct.quantity;

        if (categoryCounts.hasOwnProperty(category)) {
          categoryCounts[category] += productCount;
        }
      });
    });

    // Step 3: Prepare data for chart
    const categories = Object.keys(categoryCounts);
    const categoryValues = Object.values(categoryCounts);

    // Step 4: Create the chart for categories
    const categoryChart = echarts.init(document.querySelector("#categoryChart"));
    const categoryChartOptions = {
      title: {
        text: 'Nombre de Produits Vendus par Catégorie',
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
          type: 'shadow'
        }
      },
      legend: {
        data: ['Nombre de Produits'],
        bottom: '5%',
        textStyle: {
          fontSize: 14,
          color: '#666'
        }
      },
      grid: {
        left: '4%',
        right: '5%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          textStyle: {
            fontSize: 14
          }
        },
        axisLine: {
          lineStyle: {
            color: '#888'
          }
        }
      },
      yAxis: {
        type: 'value',
        axisLine: {
          lineStyle: {
            color: '#888'
          }
        },
        splitLine: {
          lineStyle: {
            type: 'dashed',
            color: '#ccc'
          }
        }
      },
      series: [
        {
          name: 'Nombre de Produits',
          type: 'bar',
          barWidth: '20%', // Keeping the bars thin for better readability
          data: categoryValues,
          itemStyle: {
            color: '#42a5f5',
            borderRadius: [10, 5, 0, 0] // Adds rounded corners for a modern look
          }
        }
      ]
    };
    categoryChart.setOption(categoryChartOptions);
  }


  private createProductPopularityChart(orders: any[]) {
    // Step 1: Process and aggregate product data
    const productData = this.processProductData(orders);

    // Step 2: Create and configure chart
    const chartContainer = document.querySelector("#productPopularityChart") as HTMLDivElement;
    if (!chartContainer) return;

    const productPopularityChart = echarts.init(chartContainer);
    const options = this.getChartOptions(productData);

    // Step 3: Set chart options and handle responsiveness
    productPopularityChart.setOption(options);
    this.handleChartResponsiveness(productPopularityChart);
  }

  private processProductData(orders: any[]) {
    // Aggregate product quantities
    const productCounts = new Map<string, number>();

    orders.forEach(order => {
      order.orderProducts.forEach(orderProduct => {
        const productName = orderProduct.product.nom;
        const quantity = orderProduct.quantity;
        productCounts.set(
          productName,
          (productCounts.get(productName) || 0) + quantity
        );
      });
    });

    // Convert to array, filter and sort
    return Array.from(productCounts.entries())
      .filter(([_, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name,
        value,
        // Add label configuration based on value
        label: {
          show: true,
          formatter: `${name}: ${value} unités`,
          fontSize: value > (Math.max(...Array.from(productCounts.values())) / 2) ? 14 : 12
        }
      }));
  }

  private generateColorPalette(dataLength: number): string[] {
    const palette = [];
    const baseHue = 210; // Blue base
    const saturationRange = [65, 75];
    const lightnessRange = [45, 65];

    for (let i = 0; i < dataLength; i++) {
      const hue = (baseHue + (i * 360 / dataLength)) % 360;
      const saturation = saturationRange[0] + (i * (saturationRange[1] - saturationRange[0]) / dataLength);
      const lightness = lightnessRange[0] + (i * (lightnessRange[1] - lightnessRange[0]) / dataLength);
      palette.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }

    return palette;
  }

  private getChartOptions(data: any[]): echarts.EChartsOption {
    const isSmallScreen = window.innerWidth < 768;
    const colors = this.generateColorPalette(data.length);

    return {
      title: {
        text: '',
        left: 'center',
        top: '5%',
        textStyle: {
          fontSize: isSmallScreen ? 16 : 20,
          fontWeight: 'bold',
          color: '#333'
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const value = params.value;
          const percent = params.percent;
          return `${params.name}<br/>Quantité: ${value} unités<br/>Pourcentage: ${percent}%`;
        },
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: '#ccc',
        borderWidth: 1,
        textStyle: {
          color: '#333',
          fontSize: isSmallScreen ? 12 : 14
        }
      },
      legend: {
        type: 'scroll',
        orient: 'vertical',
        left: isSmallScreen ? '2%' : 'left',
        top: 'middle',
        itemWidth: 15,
        itemHeight: 10,
        pageButtonPosition: 'end',
        pageButtonItemGap: 5,
        pageButtonGap: 5,
        textStyle: {
          fontSize: isSmallScreen ? 10 : 12,
          color: '#666'
        },
        formatter: (name: string) => {
          return name.length > 20 ? name.slice(0, 17) + '...' : name;
        }
      },
      series: [{
        name: 'Produits Commandés',
        type: 'pie',
        radius: isSmallScreen ? ['35%', '65%'] : ['40%', '70%'],
        center: isSmallScreen ? ['50%', '50%'] : ['60%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: !isSmallScreen,
          position: 'outer',
          formatter: '{b}: {c} unités',
          fontSize: 12,
          overflow: 'truncate',
          width: 120
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        labelLine: {
          show: !isSmallScreen,
          length: 15,
          length2: 10,
          smooth: true
        },
        data: data,
        color: colors
      }]
    };
  }

  private handleChartResponsiveness(chart: echarts.ECharts) {
    // Debounced resize handler
    let resizeTimeout: any;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        chart.resize();
        const options = this.getChartOptions(chart.getOption().series[0].data);
        chart.setOption(options);
      }, 250);
    };

    window.addEventListener('resize', handleResize);

    // Clean up
    const observer = new ResizeObserver(handleResize);
    const container = document.querySelector("#productPopularityChart") as HTMLDivElement;
    if (container) {
      observer.observe(container);
    }
  }



}
