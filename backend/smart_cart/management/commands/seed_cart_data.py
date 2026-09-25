import uuid
from decimal import Decimal
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone

from smart_cart.models import CustomerMembership, Product, PastOrder, PastOrderItem, CartSession


class Command(BaseCommand):
    help = "Seeds 20 popular Indian retail products, customer memberships, and realistic Indian market basket purchase history."

    def handle(self, *args, **options):
        self.stdout.write("Starting Smart Cart Indian retail database seeding...")

        # 1. 20 Popular Indian Retail Products (Kirana & Supermarket staples)
        products_data = [
            # --- Dairy & Milk ---
            {
                "sku": "MILK-AMUL-01",
                "name": "Amul Taaza Fresh Toned Milk (1L)",
                "category": "Dairy",
                "price": Decimal("54.00"),
                "barcode": "890126201001",
                "shelf_location": "Dairy Chiller - Shelf A",
                "current_stock": 60,
            },
            {
                "sku": "MILK-AMUL-02",
                "name": "Amul Gold Full Cream Milk (1L)",
                "category": "Dairy",
                "price": Decimal("66.00"),
                "barcode": "890126201002",
                "shelf_location": "Dairy Chiller - Shelf A",
                "current_stock": 45,
            },
            {
                "sku": "BUTTER-AMUL-01",
                "name": "Amul Pasteurised Butter (500g)",
                "category": "Dairy",
                "price": Decimal("275.00"),
                "barcode": "890126201003",
                "shelf_location": "Dairy Chiller - Shelf B",
                "current_stock": 35,
            },

            # --- Biscuits & Cookies ---
            {
                "sku": "BISC-PARLE-01",
                "name": "Fresh Muffin Cake (120g)",
                "category": "Bakery",
                "price": Decimal("45.00"),
                "barcode": "890171901001",
                "shelf_location": "Bakery Counter - Rack 2",
                "current_stock": 100,
            },
            {
                "sku": "BISC-GOODDAY-01",
                "name": "Britannia Good Day Butter Cookies (200g)",
                "category": "Biscuits & Bakery",
                "price": Decimal("40.00"),
                "barcode": "890171901002",
                "shelf_location": "Aisle 2 - Biscuit Rack 2",
                "current_stock": 70,
            },
            {
                "sku": "BISC-OREO-01",
                "name": "Cadbury Oreo Vanilla Creme Biscuits (120g)",
                "category": "Biscuits & Bakery",
                "price": Decimal("35.00"),
                "barcode": "890171901003",
                "shelf_location": "Aisle 2 - Biscuit Rack 3",
                "current_stock": 50,
            },
            {
                "sku": "BISC-BOURBON-01",
                "name": "Britannia Bourbon Chocolate Biscuits (150g)",
                "category": "Biscuits & Bakery",
                "price": Decimal("30.00"),
                "barcode": "890171901004",
                "shelf_location": "Aisle 2 - Biscuit Rack 4",
                "current_stock": 45,
            },

            # --- Tea, Coffee & Beverages ---
            {
                "sku": "TEA-TATAGOLD-01",
                "name": "Tata Tea Gold Premium Leaf Tea (500g)",
                "category": "Tea & Beverages",
                "price": Decimal("310.00"),
                "barcode": "890103002001",
                "shelf_location": "Aisle 3 - Tea Shelf",
                "current_stock": 40,
            },
            {
                "sku": "COFFEE-NESCAFE-01",
                "name": "Nescafe Classic 100% Pure Coffee (50g)",
                "category": "Tea & Beverages",
                "price": Decimal("190.00"),
                "barcode": "890103002002",
                "shelf_location": "Aisle 3 - Coffee Shelf",
                "current_stock": 35,
            },

            # --- Instant Food & Snacks ---
            {
                "sku": "NOOD-MAGGI-01",
                "name": "Maggi 2-Minute Masala Instant Noodles (280g)",
                "category": "Instant Food",
                "price": Decimal("50.00"),
                "barcode": "890105803001",
                "shelf_location": "Aisle 4 - Noodle Bay",
                "current_stock": 90,
            },
            {
                "sku": "SNACK-BHUJIA-01",
                "name": "Haldiram's Nagpur Aloo Bhujia (200g)",
                "category": "Snacks & Namkeen",
                "price": Decimal("55.00"),
                "barcode": "890105803002",
                "shelf_location": "Aisle 4 - Namkeen Rack",
                "current_stock": 60,
            },
            {
                "sku": "CHIPS-LAYS-01",
                "name": "Lay's India's Magic Masala Chips (50g)",
                "category": "Snacks & Chips",
                "price": Decimal("20.00"),
                "barcode": "890105803003",
                "shelf_location": "Aisle 4 - Chips Rack",
                "current_stock": 80,
            },

            # --- Staples, Atta & Oil ---
            {
                "sku": "BEV-COKE-01",
                "name": "Coca-Cola (Coke)",
                "category": "Beverages",
                "price": Decimal("40.00"),
                "barcode": "8901764012011",
                "shelf_location": "Aisle 1 - Cold Beverage Chiller",
                "current_stock": 50,
            },
            {
                "sku": "OIL-FORTUNE-01",
                "name": "Fortune Sunlite Refined Sunflower Oil (1L)",
                "category": "Pantry & Oils",
                "price": Decimal("145.00"),
                "barcode": "890103004002",
                "shelf_location": "Aisle 1 - Oil Section",
                "current_stock": 65,
            },
            {
                "sku": "SALT-TATA-01",
                "name": "Tata Salt Vacuum Evaporated Iodized Salt (1kg)",
                "category": "Pantry & Staples",
                "price": Decimal("28.00"),
                "barcode": "890103004003",
                "shelf_location": "Aisle 1 - Spice Shelf",
                "current_stock": 100,
            },

            # --- Sauces, Spreads & Chocolates ---
            {
                "sku": "SAUCE-KISSAN-01",
                "name": "Kissan Fresh Tomato Ketchup (950g)",
                "category": "Sauces & Spreads",
                "price": Decimal("130.00"),
                "barcode": "890103005001",
                "shelf_location": "Aisle 5 - Sauces Rack",
                "current_stock": 40,
            },
            {
                "sku": "HONEY-DABUR-01",
                "name": "Dabur 100% Pure Squeezy Honey (250g)",
                "category": "Breakfast & Spreads",
                "price": Decimal("120.00"),
                "barcode": "890103005002",
                "shelf_location": "Aisle 5 - Honey Shelf",
                "current_stock": 30,
            },
            {
                "sku": "CHOC-DAIRYMILK-01",
                "name": "Cadbury Dairy Milk Silk Chocolate (50g)",
                "category": "Chocolates & Sweets",
                "price": Decimal("45.00"),
                "barcode": "890103005003",
                "shelf_location": "Checkout Bay - Confectionery",
                "current_stock": 75,
            },

            # --- Personal Care & Household ---
            {
                "sku": "SOAP-DETTOL-01",
                "name": "Dettol Original Germ Protection Soap (75g)",
                "category": "Personal Care",
                "price": Decimal("42.00"),
                "barcode": "890103006001",
                "shelf_location": "Aisle 6 - Hygiene Shelf",
                "current_stock": 80,
            },
            {
                "sku": "PASTE-COLGATE-01",
                "name": "Colgate Strong Teeth Dental Toothpaste (150g)",
                "category": "Personal Care",
                "price": Decimal("115.00"),
                "barcode": "890103006002",
                "shelf_location": "Aisle 6 - Dental Care",
                "current_stock": 60,
            },
        ]

        products_map = {}
        for pdata in products_data:
            prod, _ = Product.objects.update_or_create(
                sku=pdata["sku"],
                defaults=pdata
            )
            products_map[pdata["sku"]] = prod

        self.stdout.write(f"Created/updated {len(products_map)} Indian retail products.")

        # 2. Customer Memberships (Indian Retail Shoppers)
        members_data = [
            {
                "member_id": "MEM-IND-101",
                "name": "Rahul Sharma",
                "phone": "+91 98201 12345",
                "email": "rahul.sharma@example.com",
                "tier": CustomerMembership.Tier.GOLD,
                "discount_percent": Decimal("10.00"),
                "loyalty_points": 320,
            },
            {
                "member_id": "MEM-IND-102",
                "name": "Priya Patel",
                "phone": "+91 98450 67890",
                "email": "priya.patel@example.com",
                "tier": CustomerMembership.Tier.SILVER,
                "discount_percent": Decimal("5.00"),
                "loyalty_points": 140,
            },
            {
                "member_id": "MEM-IND-103",
                "name": "Amit Verma",
                "phone": "+91 97110 54321",
                "email": "amit.verma@example.com",
                "tier": CustomerMembership.Tier.PLATINUM,
                "discount_percent": Decimal("15.00"),
                "loyalty_points": 0,  # Brand new member: 0 past orders to verify fallback!
            },
            {
                "member_id": "MEM-IND-104",
                "name": "Ananya Iyer",
                "phone": "+91 99800 88776",
                "email": "ananya.iyer@example.com",
                "tier": CustomerMembership.Tier.GOLD,
                "discount_percent": Decimal("10.00"),
                "loyalty_points": 280,
            },
        ]

        members_map = {}
        for mdata in members_data:
            mem, _ = CustomerMembership.objects.update_or_create(
                member_id=mdata["member_id"],
                defaults=mdata
            )
            members_map[mdata["member_id"]] = mem

        self.stdout.write(f"Created/updated {len(members_map)} members.")

        # 3. Market Basket Transactions (Realistic Indian Retail History)
        PastOrderItem.objects.all().delete()
        PastOrder.objects.all().delete()

        now = timezone.now()
        order_counter = 1

        def add_order(member_obj, sku_list, days_ago=1):
            nonlocal order_counter
            order_id = f"IND-ORD-{order_counter:04d}"
            order_counter += 1
            order_date = now - timedelta(days=days_ago, hours=(order_counter % 12))

            items_to_add = [products_map[s] for s in sku_list if s in products_map]
            total = sum(p.price for p in items_to_add)
            if member_obj:
                total = total * (Decimal("1.00") - (member_obj.discount_percent / Decimal("100.00")))

            order = PastOrder.objects.create(
                order_id=order_id,
                member=member_obj,
                total_amount=round(total, 2),
                created_at=order_date,
            )

            for prod in items_to_add:
                PastOrderItem.objects.create(
                    order=order,
                    product=prod,
                    quantity=1,
                    unit_price=prod.price,
                )

        # --- A. Classic Indian Basket #1: Milk + Parle-G Biscuits + Tata Tea Gold ---
        # (When someone buys Milk -> Recommend Parle-G & Tata Tea!)
        for i in range(25):
            add_order(None, ["MILK-AMUL-01", "BISC-PARLE-01", "TEA-TATAGOLD-01"], days_ago=i + 1)

        # --- B. Indian Basket #2: Milk + Britannia Good Day Cookies ---
        for i in range(16):
            add_order(None, ["MILK-AMUL-01", "BISC-GOODDAY-01", "TEA-TATAGOLD-01"], days_ago=i + 2)

        # --- C. Indian Basket #3: Maggi Noodles + Kissan Ketchup + Amul Butter ---
        for i in range(20):
            add_order(None, ["NOOD-MAGGI-01", "SAUCE-KISSAN-01", "BUTTER-AMUL-01"], days_ago=i + 1)

        # --- D. Indian Basket #4: Monthly Staples (Aashirvaad Atta + Fortune Oil + Tata Salt) ---
        for i in range(18):
            add_order(None, ["drink011", "OIL-FORTUNE-01", "SALT-TATA-01"], days_ago=i + 1)

        # --- E. Indian Basket #5: Evening Chai & Snacks (Tata Tea + Haldiram's Bhujia + Good Day) ---
        for i in range(14):
            add_order(None, ["TEA-TATAGOLD-01", "SNACK-BHUJIA-01", "BISC-GOODDAY-01"], days_ago=i + 2)

        # --- F. Indian Basket #6: Kids & Sweets (Cadbury Dairy Milk + Oreo Biscuits + Lay's) ---
        for i in range(15):
            add_order(None, ["CHOC-DAIRYMILK-01", "BISC-OREO-01", "CHIPS-LAYS-01"], days_ago=i + 1)

        # --- G. Member Rahul Sharma (MEM-IND-101) Personal Habits: ---
        # Rahul strongly pairs Amul Milk with Parle-G and Tata Tea Gold
        for i in range(8):
            add_order(members_map["MEM-IND-101"], ["MILK-AMUL-01", "BISC-PARLE-01", "TEA-TATAGOLD-01", "BUTTER-AMUL-01"], days_ago=i * 3 + 1)
        for i in range(4):
            add_order(members_map["MEM-IND-101"], ["MILK-AMUL-01", "BISC-GOODDAY-01"], days_ago=i * 4 + 2)

        # --- H. Member Priya Patel (MEM-IND-102) Personal Habits: ---
        # Priya loves Maggi + Kissan Ketchup + Bourbon Biscuits
        for i in range(7):
            add_order(members_map["MEM-IND-102"], ["NOOD-MAGGI-01", "SAUCE-KISSAN-01", "BISC-BOURBON-01"], days_ago=i * 4 + 1)

        # --- I. Member Ananya Iyer (MEM-IND-104) Personal Habits: ---
        # Ananya buys Atta + Fortune Oil + Tata Salt regularly
        for i in range(6):
            add_order(members_map["MEM-IND-104"], ["ATTA-AASHIR-01", "OIL-FORTUNE-01", "SALT-TATA-01"], days_ago=i * 5 + 1)

        # Note: Amit Verma (MEM-IND-103) has 0 orders to test seamless fallback to normal people!

        total_orders = PastOrder.objects.count()
        total_order_items = PastOrderItem.objects.count()
        self.stdout.write(f"Seeded {total_orders} historical orders ({total_order_items} basket items).")

        # 4. Initialize active demo cart
        cart, _ = CartSession.objects.get_or_create(cart_id="CART-01")
        cart.status = CartSession.Status.ACTIVE
        cart.member = None  # Start as Guest
        cart.items.all().delete()
        cart.save()
        self.stdout.write("Initialized active demo cart 'CART-01' (Guest Shopper).")

        self.stdout.write(self.style.SUCCESS("Successfully seeded 20 Indian retail products & market baskets!"))
