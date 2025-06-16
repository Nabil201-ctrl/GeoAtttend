export default function Footer() {
  return (
    <footer className="bg-white shadow-t py-4">
      <div className="container mx-auto px-4 text-center text-textSecondary text-sm">
        &copy; {new Date().getFullYear()} GeoAttend. All rights reserved.
      </div>
    </footer>
  );
}