const salesClients = [
	'Acme Retail', 'Northstar Health', 'Bluebird Logistics', 'Cedar Hotels',
	'Delta Manufacturing', 'Evergreen Schools', 'Harbor Foods', 'Juniper Labs',
	'Apex Solutions', 'Zenith Global', 'Beacon Tech', 'Vanguard Media'
];

const products = [
	['SKU-1001', 'Wireless Barcode Scanner', 129.99, 18, 'Hardware'],
	['SKU-1002', 'Thermal Receipt Printer', 249.50, 12, 'Hardware'],
	['SKU-1003', 'Industrial Label Roll', 14.75, 80, 'Supplies'],
	['SKU-1004', 'USB-C Docking Station', 189.00, 15, 'Accessories'],
	['SKU-1005', 'Ergonomic Keyboard', 74.25, 25, 'Peripherals'],
	['SKU-1006', 'Inventory Tablet', 429.00, 10, 'Hardware'],
	['SKU-1007', 'Packing Tape Dispenser', 31.80, 30, 'Supplies'],
	['SKU-1008', 'Shipping Scale', 96.40, 14, 'Hardware'],
	['SKU-1009', 'Safety Vest', 22.95, 45, 'Safety'],
	['SKU-1010', 'Pallet Wrap Film', 38.60, 35, 'Supplies']
];

const hrEmployeesData = [
	['Alice Johnson', 'Engineering', 'Senior Full Stack Engineer', 125000, 4.8, 'Active'],
	['Bob Martinez', 'Engineering', 'DevOps Architect', 135000, 4.9, 'Active'],
	['Carol White', 'Engineering', 'Frontend Developer', 98000, 4.6, 'Active'],
	['David Miller', 'Engineering', 'Backend Developer', 105000, 4.5, 'Active'],
	['Eva Green', 'Sales', 'Account Executive', 88000, 4.7, 'Active'],
	['Frank Harris', 'Sales', 'Sales Director', 140000, 4.9, 'Active'],
	['Grace Lee', 'Sales', 'Business Development Rep', 65000, 4.2, 'Active'],
	['Henry Taylor', 'Marketing', 'Content Strategist', 78000, 4.4, 'Active'],
	['Iris Clark', 'Marketing', 'Digital Marketing Lead', 95000, 4.6, 'Active'],
	['Jack Robinson', 'Finance', 'Financial Analyst', 85000, 4.7, 'Active'],
	['Karen Lewis', 'Finance', 'Chief Financial Officer', 165000, 5.0, 'Active'],
	['Leo Walker', 'Human Resources', 'HR Manager', 92000, 4.8, 'Active'],
	['Mia Hall', 'Human Resources', 'Talent Acquisition Partner', 72000, 4.3, 'Active'],
	['Noah Allen', 'Operations', 'Supply Chain Manager', 105000, 4.6, 'Active'],
	['Olivia Young', 'Operations', 'Logistics Coordinator', 68000, 4.1, 'Active'],
	['Peter King', 'Support', 'Customer Success Lead', 75000, 4.5, 'Active'],
	['Quinn Wright', 'Support', 'Technical Support Agent', 58000, 4.0, 'Active'],
	['Rachel Scott', 'Engineering', 'QA Engineer', 86000, 4.4, 'Active'],
	['Samuel Adams', 'Finance', 'Senior Accountant', 96000, 4.7, 'Active'],
	['Tara Baker', 'Sales', 'Enterprise Account Exec', 115000, 4.8, 'Active']
];

const financeCategories = [
	{ category: 'Software Subscriptions', type: 'Expense', min: 1200, max: 4500 },
	{ category: 'Cloud Infrastructure', type: 'Expense', min: 3500, max: 9800 },
	{ category: 'Payroll & Benefits', type: 'Expense', min: 25000, max: 45000 },
	{ category: 'Office & Facilities', type: 'Expense', min: 2000, max: 6000 },
	{ category: 'Marketing & Advertising', type: 'Expense', min: 4000, max: 12000 },
	{ category: 'Client Enterprise Contracts', type: 'Revenue', min: 15000, max: 55000 },
	{ category: 'Professional Services & Consulting', type: 'Revenue', min: 8000, max: 24000 },
	{ category: 'Hardware & License Sales', type: 'Revenue', min: 5000, max: 18000 },
	{ category: 'Recurring SaaS Billing', type: 'Revenue', min: 12000, max: 32000 }
];

function dateAtOffset(daysAgo, hour) {
	const date = new Date();
	date.setHours(hour, 0, 0, 0);
	date.setDate(date.getDate() - daysAgo);
	return date.toISOString();
}

const sales = Array.from({ length: 60 }, (_, index) => ({
	id: index + 1,
	clientName: salesClients[index % salesClients.length],
	totalAmount: Number((325 + ((index * 173) % 2400) + (index % 4) * 19.5).toFixed(2)),
	status: index % 9 === 0 ? 'Pending' : index % 7 === 0 ? 'Refunded' : 'Completed',
	createdAt: dateAtOffset(index % 30, 9 + (index % 8))
}));

const inventory = Array.from({ length: 50 }, (_, index) => {
	const [sku, name, unitPrice, minStockLevel, category] = products[index % products.length];

	return {
		id: index + 1,
		sku: `${sku}-${String(Math.floor(index / products.length) + 1).padStart(2, '0')}`,
		name,
		category: category || 'General',
		quantity: 8 + ((index * 17) % 108),
		minStockLevel,
		unitPrice,
		createdAt: dateAtOffset((index * 3) % 30, 8)
	};
});

const hr = Array.from({ length: 40 }, (_, index) => {
	const [nameBase, department, role, salaryBase, rating, status] = hrEmployeesData[index % hrEmployeesData.length];
	const name = index >= hrEmployeesData.length ? `${nameBase} ${String.fromCharCode(65 + (index % 26))}.` : nameBase;
	const salary = salaryBase + ((index * 750) % 8000);

	return {
		id: index + 1,
		name,
		department,
		role,
		salary,
		performanceRating: rating,
		status: index % 12 === 0 ? 'On Leave' : 'Active',
		hireDate: dateAtOffset(Math.floor(index * 25) + 15, 9).split('T')[0],
		createdAt: dateAtOffset((index * 2) % 30, 10)
	};
});

const finance = Array.from({ length: 50 }, (_, index) => {
	const catInfo = financeCategories[index % financeCategories.length];
	const amount = Number((catInfo.min + ((index * 397) % (catInfo.max - catInfo.min + 1))).toFixed(2));

	return {
		id: index + 1,
		transactionType: catInfo.type,
		category: catInfo.category,
		amount,
		description: `${catInfo.type === 'Revenue' ? 'Invoiced' : 'Payment for'} ${catInfo.category} #${1000 + index}`,
		status: index % 10 === 0 ? 'Pending' : 'Completed',
		createdAt: dateAtOffset((index * 2) % 30, 11)
	};
});

module.exports = { sales, inventory, hr, finance };
